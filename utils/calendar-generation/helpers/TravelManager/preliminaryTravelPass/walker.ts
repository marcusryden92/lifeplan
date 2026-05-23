import { Category } from "@/types/prisma";
import { Slot } from "../../../models/TimeSlot";
import { TravelManager } from "../../../core/TravelManager";
import { dropUnreachableCategoryVisits } from "../dropUnreachableCategoryVisits";
import { TravelPassRecorder } from "../TravelPassRecorder";
import { M } from "../travelPassMessages";
import { handleAvailable } from "./handleAvailable";
import { handleCategory } from "./handleCategory";

/**
 * Walks slots[] in order and places travel slots for location transitions.
 * Implements the decision tree in notes/claudeTravelCriteria.md.
 *
 * Trespass markers are set directly on CategorySlot fragments
 * (trespassingStart / trespassingEnd) so downstream wrapper-marking can
 * read them from the slot array without a side-channel. When the travel
 * pass fully replaces a CategorySlot with a Travel slot, the categoryId
 * is recorded on TravelSlot.consumedCategoryIds for the same purpose.
 *
 * Iteration: each handler returns the next index to process. The walker
 * uses a while-loop and sets i to the handler's return value, so newly
 * inserted slots don't get re-processed.
 */
export function preliminaryTravelPass(
  hasLocationMap: boolean,
  categories: Category[],
  slots: Slot[],
  travelManager: TravelManager,
  recorder?: TravelPassRecorder,
): void {
  if (!hasLocationMap) return;

  // Pre-pass: drop unreachable category visits (the "jump cat 2" case) so the
  // walker reaches each cat boundary with a clean three-cat shape.
  dropUnreachableCategoryVisits(hasLocationMap, slots, travelManager);

  let i = 0;
  while (i < slots.length) {
    const slot = slots[i];

    if (slot.type === "occupied" || slot.type === "travel") {
      recorder?.beginSlot(slot);
      recorder?.decision(M.walker.skipOccupiedOrTravel(recorder.label(slot)), 0);
      recorder?.endSlot(slots);
      i += 1;
      continue;
    }

    recorder?.beginSlot(slot);

    if (slot.type === "available") {
      i = handleAvailable(slots, i, travelManager, categories, recorder);
      clearTrespassesUnderTravelInteriors(slots);
      recorder?.endSlot(slots);
      continue;
    }

    if (slot.type === "category") {
      i = handleCategory(slots, i, travelManager, categories, recorder);
      clearTrespassesUnderTravelInteriors(slots);
      recorder?.endSlot(slots);
      continue;
    }

    recorder?.endSlot(slots);
    i += 1;
  }
}

// ---------------------------------------------------------------------------
// Invariant maintenance: after each walker iteration, drop any trespass
// boundary whose point now sits strictly inside an existing Travel slot's
// interior. Trespass markers signal a category boundary that has no visible
// travel crossing it; once a cascade produces a travel whose span subsumes
// the boundary point, the marker is redundant — the visible travel already
// conveys the crossing.
//
// Running this per-iteration keeps the slots array in a consistent state for
// subsequent handlers (and for the downstream wrapper-marker code that reads
// these flags). Marker setters always clear the corresponding flag on slots
// they shorten directly; this helper covers the rarer case where a later
// cascade's travel sweeps across a marker on a surviving neighbour.
// ---------------------------------------------------------------------------

function clearTrespassesUnderTravelInteriors(slots: Slot[]): void {
  for (const slot of slots) {
    if (slot.type !== "category") continue;
    if (slot.trespassingStart && isBoundaryInsideTravel(slots, slot.start)) {
      slot.trespassingStart = undefined;
    }
    if (slot.trespassingEnd && isBoundaryInsideTravel(slots, slot.end)) {
      slot.trespassingEnd = undefined;
    }
  }
}

function isBoundaryInsideTravel(slots: Slot[], boundary: Date): boolean {
  const ms = boundary.getTime();
  for (const s of slots) {
    if (s.type !== "travel") continue;
    if (s.start.getTime() < ms && s.end.getTime() > ms) return true;
  }
  return false;
}

// Dev-time consistency stub. handleAvailable and handleCategory call this
// when the walker reaches a shape that shouldn't be reachable on a clean
// forward pass; the message goes to console in non-production builds so the
// failure mode is visible to whoever is iterating on the cascade rules.
export function logInconsistency(message: string): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[preliminaryTravelPass] ${message}`);
  }
}
