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

// Result bundle for the detect→floor→restore pattern that every cascade absorb
// uses to handle a bleed-trimmed Category sitting at the boundary of its
// absorb region. `floor` is the earliest the new travel may start (wrapperEnd
// when trimmed, otherwise the caller-provided default). `restore()` is a
// no-op when nothing was trimmed; call it before the surrounding splice.
export type BleedRecovery = {
  trimmed: BleedTrimmedCat | null;
  floor: Date;
  restore: () => void;
};

/**
 * Wraps the detect→compute-floor→restore pattern shared by every cascade
 * absorb. Pass the candidate slot to inspect (typically the slot just before
 * the absorb region, or the chosen backward anchor itself), the fallback
 * floor to use when the slot isn't a bleed-trimmed Category, and — for
 * backward cascades — an optional `maxWrapperEnd` so we never restore past
 * the absorb's far edge.
 */
export function detectBleedRecovery(
  candidateSlot: Slot | undefined,
  categories: Category[],
  defaultFloor: Date,
  maxWrapperEnd?: Date,
): BleedRecovery {
  const trimmed = detectBleedTrimmedCat(candidateSlot, categories, maxWrapperEnd);
  return {
    trimmed,
    floor: trimmed ? trimmed.wrapperEnd : defaultFloor,
    restore: () => {
      if (trimmed) restoreBleedTrimmedCat(trimmed);
    },
  };
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

// The fit may land inside an Available, Category, OR a zero-distance Travel
// sentinel (the marker the pre-pass leaves where it killed an unreachable
// category). Sentinels are traversable because the user is statically at
// that location through them.
export type ForwardCandidateSlot = AvailableSlot | CategorySlot | TravelSlot;

export type ForwardFitResult =
  | {
      kind: "naturalFit";
      idx: number;
      slot: ForwardCandidateSlot;
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
      slot: ForwardCandidateSlot;
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
  slot: ForwardCandidateSlot;
  destination: string;
  T: number;
  fitKind: "naturalFit" | "preFit" | "overflow";
  consumed: number;
};

// True for zero-distance Travel slots — they're sentinels for consumed cats
// where the user stays at travelFromLocationId throughout. The cascade can
// traverse them as if they were free time at that location.
function isZeroDistanceSentinel(slot: Slot): boolean {
  return (
    slot.type === "travel" &&
    slot.travelFromLocationId !== null &&
    slot.travelFromLocationId === slot.travelToLocationId
  );
}

// A candidate slot can have two landing targets:
//   - preFitTarget: where the user is expected to BE at slot.start. The travel
//     ends at slot.start and the slot survives intact.
//   - naturalFitTarget: where the user ends up AFTER landing somewhere inside
//     the slot. The slot's head [start, landing] is absorbed by the travel,
//     its tail [landing, end] survives. Null when partial-split would leave
//     an incoherent fragment (sentinels, where the marker is atomic).
//
// Category: both targets are the Category's own location. The Cat already
// sits at the destination, so landing inside it leaves a coherent tail (user
// at cat.location for the surviving cat.tail).
//
// Travel sentinel: only preFitTarget. Sentinels are dropped-cat markers; a
// partial split would imply the dropped cat is partially un-dropped, which
// is contradictory.
//
// Available "always-next": preFit lands at slot.start with the user at prev
// (matches Available.prevLoc); naturalFit lands inside, with the user already
// transitioned to next.
//
// Available "transit-only": only relevant when prev === next (the user is
// sitting at one place); preFit/naturalFit both target that location.
function resolveLandingTargets(
  slot: ForwardCandidateSlot,
  mode: AvailableCandidateMode,
): { preFitTarget: string | null; naturalFitTarget: string | null } {
  if (slot.type === "category") {
    return {
      preFitTarget: slot.currentLocationId,
      naturalFitTarget: slot.currentLocationId,
    };
  }
  if (slot.type === "travel") {
    // Zero-distance sentinel. Real travels never reach this helper — they're
    // hard-stopped above.
    return { preFitTarget: slot.travelFromLocationId, naturalFitTarget: null };
  }
  if (mode === "always-next") {
    return {
      preFitTarget: slot.prevLocationId ?? null,
      naturalFitTarget: slot.nextLocationId ?? null,
    };
  }
  if (slot.prevLocationId && slot.prevLocationId === slot.nextLocationId) {
    return {
      preFitTarget: slot.prevLocationId,
      naturalFitTarget: slot.prevLocationId,
    };
  }
  return { preFitTarget: null, naturalFitTarget: null };
}

export function walkForwardForFit(args: {
  slots: Slot[];
  startIdx: number;
  // Absolute reference timestamp the walker uses to measure elapsed time at
  // each candidate slot — consumedMs = slot.start - referenceStartTime. Using
  // a fixed reference avoids drift from slot.durationMinutes flooring when
  // timestamps have sub-minute precision (e.g. a 21.5-minute Category stored
  // as durationMinutes=21 would otherwise undercount by 30 seconds and push
  // travelEnd past the natural boundary).
  referenceStartTime: Date;
  initialConsumedCategoryIds: string[];
  availableCandidateMode: AvailableCandidateMode;
  travelManager: TravelManager;
  origin: string;
  referenceTime: (slot: ForwardCandidateSlot) => Date;
  hardStopReferenceTime: Date;
  onVisit?: (event: ForwardWalkEvent) => void;
}): ForwardFitResult {
  const consumedCategoryIds = [...args.initialConsumedCategoryIds];
  const referenceMs = args.referenceStartTime.getTime();
  let idx = args.startIdx;

  while (idx < args.slots.length) {
    const slot = args.slots[idx];
    const slotStartMs = slot.start.getTime();
    const slotEndMs = slot.end.getTime();
    const consumedMs = slotStartMs - referenceMs;
    const consumedMinutes = Math.floor(consumedMs / 60000);

    // Real hard stops: Occupied (any) and non-sentinel Travel (the walker
    // placed it for a real transition; absorbing would invalidate that).
    const isRealHardStop =
      slot.type === "occupied" ||
      (slot.type === "travel" && !isZeroDistanceSentinel(slot));
    if (isRealHardStop) {
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
        consumed: consumedMinutes,
        consumedCategoryIds,
      };
    }

    const candidate = slot as ForwardCandidateSlot;
    const { preFitTarget, naturalFitTarget } = resolveLandingTargets(
      candidate,
      args.availableCandidateMode,
    );
    const slotDurMs = slotEndMs - slotStartMs;
    const refTime = args.referenceTime(candidate);

    const T_pre = preFitTarget
      ? args.travelManager.getTravelTime(args.origin, preFitTarget, refTime)
      : 0;
    const T_nat = naturalFitTarget
      ? args.travelManager.getTravelTime(args.origin, naturalFitTarget, refTime)
      : 0;
    const T_pre_ms = T_pre * 60000;
    const T_nat_ms = T_nat * 60000;

    // preFit: travel ends at slot.start with the slot surviving intact.
    // Try each candidate target in order. preFitTarget is the primary
    // (slot.prevLocationId for Available always-next; the cat's location for
    // Category). naturalFitTarget — when different — is the "redirect"
    // fallback for Available always-next where T(origin→prev) doesn't fit
    // but T(origin→next) does; the slot's prev→next transition becomes
    // redundant and the surviving slot is effectively Available at next
    // throughout.
    const preFitOptions: { target: string; T: number; Tms: number }[] = [];
    if (preFitTarget && T_pre > 0) {
      preFitOptions.push({ target: preFitTarget, T: T_pre, Tms: T_pre_ms });
    }
    if (naturalFitTarget && naturalFitTarget !== preFitTarget && T_nat > 0) {
      preFitOptions.push({ target: naturalFitTarget, T: T_nat, Tms: T_nat_ms });
    }
    for (const opt of preFitOptions) {
      if (opt.Tms <= consumedMs) {
        args.onVisit?.({
          kind: "candidate",
          idx,
          slot: candidate,
          destination: opt.target,
          T: opt.T,
          fitKind: "preFit",
          consumed: consumedMinutes,
        });
        return {
          kind: "preFit",
          idx,
          slot: candidate,
          destination: opt.target,
          T: opt.T,
          consumed: consumedMinutes,
          consumedCategoryIds,
        };
      }
    }

    // naturalFit at naturalFitTarget — travel lands inside slot at the user
    // arriving at naturalFitTarget. Slot tail [landing, end] survives.
    if (
      naturalFitTarget &&
      T_nat > 0 &&
      T_nat_ms > consumedMs &&
      T_nat_ms <= consumedMs + slotDurMs
    ) {
      const remainingMs = T_nat_ms - consumedMs;
      const travelEnd = new Date(slotStartMs + remainingMs);
      args.onVisit?.({
        kind: "candidate",
        idx,
        slot: candidate,
        destination: naturalFitTarget,
        T: T_nat,
        fitKind: "naturalFit",
        consumed: consumedMinutes,
      });
      return {
        kind: "naturalFit",
        idx,
        slot: candidate,
        destination: naturalFitTarget,
        T: T_nat,
        travelEnd,
        remaining: Math.floor(remainingMs / 60000),
        consumed: T_nat,
        consumedCategoryIds,
      };
    }

    // Overflow: emit the visit event with whichever T we evaluated (prefer the
    // naturalFit target since that's the user-facing "where would I land" T)
    // and fall through to consume the slot.
    const overflowTarget = naturalFitTarget ?? preFitTarget;
    const overflowT = T_nat > 0 ? T_nat : T_pre;
    if (overflowTarget && overflowT > 0) {
      args.onVisit?.({
        kind: "candidate",
        idx,
        slot: candidate,
        destination: overflowTarget,
        T: overflowT,
        fitKind: "overflow",
        consumed: consumedMinutes,
      });
    }

    // Consume the slot: pull in its identity for the new travel's consumed
    // list. Categories contribute their categoryId; zero-distance Travel
    // sentinels contribute their already-recorded consumedCategoryIds. No
    // consumed accumulator — the next iteration recomputes from referenceMs.
    if (slot.type === "category") {
      consumedCategoryIds.push(slot.categoryId);
    } else if (slot.type === "travel" && slot.consumedCategoryIds) {
      consumedCategoryIds.push(...slot.consumedCategoryIds);
    }
    idx += 1;
  }

  const lastSlotEndMs =
    args.slots.length > 0
      ? args.slots[args.slots.length - 1].end.getTime()
      : referenceMs;
  return {
    kind: "exhausted",
    consumed: Math.floor((lastSlotEndMs - referenceMs) / 60000),
    consumedCategoryIds,
  };
}
