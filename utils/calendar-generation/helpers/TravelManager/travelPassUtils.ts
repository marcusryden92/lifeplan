/**
 * travelPassUtils
 *
 * Pure utilities used by the preliminary travel pass. Geometry helpers,
 * lookups, and the shared forward-fit walk primitive. Kept separate from the
 * walker / handler / cascade code so the dispatch logic stays readable.
 *
 * Nothing here mutates the slots array — callers do the splicing.
 */

import { Category } from "@/types/prisma";
import {
  AvailableSlot,
  CategorySlot,
  Slot,
  TravelSlot,
} from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";
import { expandSlotForDay } from "../TimeSlotManager/expandSlotForDay";

// ---------------------------------------------------------------------------
// Bleed-trimmed category recovery
// ---------------------------------------------------------------------------

export type BleedTrimmedCat = { slot: CategorySlot; wrapperEnd: Date };

/**
 * Detects a Category slot whose end was trimmed by an earlier bleed — i.e.
 * its CategorySlot.end sits earlier than the wrapper period's true end.
 * Cascade placements that anchor on the slot's right boundary use this to
 * recover the original-fabric boundary so the new travel's left edge sits
 * cleanly on it instead of on the bleed seam.
 */
export function detectBleedTrimmedCat(
  slot: Slot | undefined,
  categories: Category[],
  maxWrapperEnd?: Date,
): BleedTrimmedCat | null {
  if (!slot || slot.type !== "category") return null;
  const wrapperEnd = findCategoryWrapperEnd(slot, categories);
  if (!wrapperEnd || wrapperEnd.getTime() <= slot.end.getTime()) return null;
  if (maxWrapperEnd && wrapperEnd.getTime() > maxWrapperEnd.getTime())
    return null;
  return { slot, wrapperEnd };
}

/**
 * Mutates the trimmed cat back to its full wrapper duration. The slot is
 * expected to survive in slots[] after the surrounding splice — the new
 * travel will start exactly at slot.end after this restore.
 */
export function restoreBleedTrimmedCat(trimmed: BleedTrimmedCat): void {
  const { slot, wrapperEnd } = trimmed;
  slot.end = wrapperEnd;
  slot.durationMinutes = Math.floor(
    (slot.end.getTime() - slot.start.getTime()) / 60000,
  );
  slot.nextLocationId = slot.currentLocationId;
  slot.trespassingEnd = undefined;
}

// ---------------------------------------------------------------------------
// Category wrapper lookup
// ---------------------------------------------------------------------------

/**
 * Look up the wrapper end of a CategorySlot by matching against its
 * Category's recurring timeSlots for the slot's day. Returns null if no
 * matching wrapper period contains the slot (which can happen if the slot's
 * boundaries were clipped by a gap rather than the wrapper itself).
 */
export function findCategoryWrapperEnd(
  slot: CategorySlot,
  categories: Category[],
): Date | null {
  const wrapper = findCategoryWrapper(slot, categories);
  return wrapper?.end ?? null;
}

export function findCategoryWrapper(
  slot: CategorySlot,
  categories: Category[],
): { start: Date; end: Date } | null {
  const category = categories.find((c) => c.id === slot.categoryId) as
    | (Category & { timeSlots?: Parameters<typeof expandSlotForDay>[0][] })
    | undefined;
  if (!category?.timeSlots) return null;

  const day = new Date(slot.start);
  day.setHours(0, 0, 0, 0);

  for (const timeSlot of category.timeSlots) {
    const period = expandSlotForDay(timeSlot, day);
    if (!period) continue;
    if (
      period.start.getTime() <= slot.start.getTime() &&
      period.end.getTime() >= slot.end.getTime()
    ) {
      return { start: period.start, end: period.end };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Recent-travel lookup (transparent prev-Available + Anywhere chain)
// ---------------------------------------------------------------------------

/**
 * Walks backward from slots[startIdx] skipping transparent slots (Available
 * leftover, Anywhere Occupied) and returns the first Travel found, or null
 * if none. Entry-edge and Available handlers use this to detect that an
 * earlier walker step has already placed the relevant travel — the caller
 * inspects the travel's destination to decide whether to skip or fall
 * through to a fresh placement.
 */
export function findRecentTravelBehind(
  slots: Slot[],
  startIdx: number,
): { travel: TravelSlot; idx: number } | null {
  let idx = startIdx;
  while (idx >= 0) {
    const s = slots[idx];
    if (s.type === "travel") return { travel: s, idx };
    if (s.type === "available") {
      idx--;
      continue;
    }
    if (s.type === "occupied" && s.locationId == null) {
      idx--;
      continue;
    }
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Forward fit walk — shared primitive used by every forward cascade. Walks
// slots[startIdx..] looking for the first slot whose location yields a
// natural-fit (T fits inside the slot given accumulated consumed minutes)
// or pre-fit (T is already <= consumed, so the travel ends at slot.start
// and the slot survives intact). Stops on Occupied / Travel; if the stop
// is a location-pinned Occupied the result carries that pin so the caller
// can retarget the final placement to it.
//
// Available candidate handling differs by call site:
//   - "always-next": treat every Available as a destination using
//     nextLocationId (the forward cascade variants that walk through transit
//     space heading toward the original target).
//   - "transit-only": only treat Available as a destination when
//     prevLocationId === nextLocationId (the user is sitting at A and the
//     surrounding cats already routed; we can land here without disturbing
//     the upcoming transition the slot is reserving).
// ---------------------------------------------------------------------------

export type AvailableCandidateMode = "always-next" | "transit-only";

export type ForwardFitResult =
  | {
      kind: "naturalFit";
      idx: number;
      slot: AvailableSlot | CategorySlot;
      destination: string;
      T: number;
      travelEnd: Date;
      // Minutes eaten from the landing slot — `T - consumed` at fit time.
      remaining: number;
      consumed: number;
      consumedCategoryIds: string[];
    }
  | {
      kind: "preFit";
      idx: number;
      slot: AvailableSlot | CategorySlot;
      destination: string;
      T: number;
      consumed: number;
      consumedCategoryIds: string[];
    }
  | {
      kind: "hardStop";
      idx: number;
      hardStopSlot: Slot;
      pinnedDestination: string | null;
      pinnedT: number;
      consumed: number;
      consumedCategoryIds: string[];
    }
  | {
      kind: "exhausted";
      consumed: number;
      consumedCategoryIds: string[];
    };

// Per-slot event fired by walkForwardForFit. Lets callers emit fine-grained
// per-slot recorder lines (e.g. "evaluated this cat", "overshot, continuing")
// without re-implementing the loop.
export type ForwardWalkEvent = {
  kind: "candidate";
  idx: number;
  slot: AvailableSlot | CategorySlot;
  destination: string;
  T: number;
  fitKind: "naturalFit" | "preFit" | "overflow";
  consumed: number;
};

function resolveForwardCandidate(
  slot: AvailableSlot | CategorySlot,
  mode: AvailableCandidateMode,
): string | null {
  if (slot.type === "category") return slot.currentLocationId;
  if (mode === "always-next") return slot.nextLocationId ?? null;
  if (slot.prevLocationId && slot.prevLocationId === slot.nextLocationId)
    return slot.prevLocationId;
  return null;
}

export function walkForwardForFit(args: {
  slots: Slot[];
  startIdx: number;
  initialConsumed: number;
  initialConsumedCategoryIds: string[];
  availableCandidateMode: AvailableCandidateMode;
  travelManager: TravelManager;
  origin: string;
  referenceTime: (slot: AvailableSlot | CategorySlot) => Date;
  hardStopReferenceTime: Date;
  onVisit?: (event: ForwardWalkEvent) => void;
}): ForwardFitResult {
  let consumed = args.initialConsumed;
  const consumedCategoryIds = [...args.initialConsumedCategoryIds];
  let idx = args.startIdx;

  while (idx < args.slots.length) {
    const slot = args.slots[idx];

    if (slot.type === "occupied" || slot.type === "travel") {
      let pinnedDestination: string | null = null;
      let pinnedT = 0;
      if (slot.type === "occupied" && slot.locationId) {
        const hardT = args.travelManager.getTravelTime(
          args.origin,
          slot.locationId,
          args.hardStopReferenceTime,
        );
        if (hardT > 0) {
          pinnedDestination = slot.locationId;
          pinnedT = hardT;
        }
      }
      return {
        kind: "hardStop",
        idx,
        hardStopSlot: slot,
        pinnedDestination,
        pinnedT,
        consumed,
        consumedCategoryIds,
      };
    }

    const slotLoc = resolveForwardCandidate(slot, args.availableCandidateMode);
    const slotDur = slot.durationMinutes;
    if (slotLoc) {
      const newT = args.travelManager.getTravelTime(
        args.origin,
        slotLoc,
        args.referenceTime(slot),
      );
      if (newT > 0) {
        const fitKind: "naturalFit" | "preFit" | "overflow" =
          newT <= consumed
            ? "preFit"
            : newT <= consumed + slotDur
              ? "naturalFit"
              : "overflow";
        args.onVisit?.({
          kind: "candidate",
          idx,
          slot,
          destination: slotLoc,
          T: newT,
          fitKind,
          consumed,
        });
        if (fitKind === "preFit") {
          return {
            kind: "preFit",
            idx,
            slot,
            destination: slotLoc,
            T: newT,
            consumed,
            consumedCategoryIds,
          };
        }
        if (fitKind === "naturalFit") {
          const remaining = newT - consumed;
          return {
            kind: "naturalFit",
            idx,
            slot,
            destination: slotLoc,
            T: newT,
            travelEnd: new Date(slot.start.getTime() + remaining * 60000),
            remaining,
            consumed: newT,
            consumedCategoryIds,
          };
        }
        // overflow — fall through to consume.
      }
    }

    if (slot.type === "category") consumedCategoryIds.push(slot.categoryId);
    consumed += slotDur;
    idx += 1;
  }

  return { kind: "exhausted", consumed, consumedCategoryIds };
}
