import { Category } from "@/types/prisma";
import {
  AvailableSlot,
  CategorySlot,
  Slot,
  TravelSlot,
} from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";
import { TravelProcessingAction } from "../../models/SchedulingModels";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";

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
  bufferTimeMinutes: number,
): void {
  if (!hasLocationMap) return;
  void categories;

  let i = 0;
  while (i < slots.length) {
    const slot = slots[i];

    if (slot.type === "occupied" || slot.type === "travel") {
      i += 1;
      continue;
    }

    if (slot.type === "available") {
      i = handleAvailable(slots, i, travelManager, bufferTimeMinutes);
      continue;
    }

    if (slot.type === "category") {
      i = handleCategory(slots, i, travelManager, bufferTimeMinutes);
      continue;
    }

    i += 1;
  }
}

// ---------------------------------------------------------------------------
// Current type: Available
// ---------------------------------------------------------------------------

function handleAvailable(
  slots: Slot[],
  i: number,
  travelManager: TravelManager,
  bufferTimeMinutes: number,
): number {
  const slot = slots[i] as AvailableSlot;

  // Outer guard: prev != next (null on either side = no transition).
  // resolveTravel tracks the leg here; absorb branches untrack and retrack.
  const action = travelManager.resolveTravel(slot);
  if (!action) return i + 1;

  // Current size: large enough for travel
  if (slot.durationMinutes >= action.travelMinutes) {
    return placeTravelInCurrent(slots, i, action);
  }

  // Current size: not large enough for travel
  const prev = i > 0 ? slots[i - 1] : null;
  const next = i + 1 < slots.length ? slots[i + 1] : null;

  // ---- Prev type: Travel (slots[i-1] directly OR slots[i-2] via transparent prev Available) ----
  const prevTravel = findPrevTravelForAvailable(slots, i);
  if (prevTravel) {
    if (next?.type === "occupied") {
      return absorbAndReplanBackward(
        slots,
        i,
        action,
        prevTravel,
        travelManager,
      );
    }
    if (next?.type === "available" || next?.type === "category") {
      return absorbAndBleedAcross(
        slots,
        i,
        action,
        prevTravel,
        next,
        travelManager,
      );
    }
    if (next?.type === "travel") {
      travelManager.untrackLeg(action.prevLocation, action.nextLocation);
      logInconsistency("Available with Prev=Travel, Next=Travel — should not occur on forward walk");
      return i + 1;
    }
  }

  // ---- Prev type: Available ----
  if (prev?.type === "available") {
    if (next?.type === "available" || next?.type === "category") {
      return bleedAcrossPrevCurrentNext(slots, i, action);
    }
    if (next?.type === "occupied") {
      return bleedIntoPrev(slots, i, action);
    }
    if (next?.type === "travel") {
      travelManager.untrackLeg(action.prevLocation, action.nextLocation);
      logInconsistency("Available with Prev=Available, Next=Travel — should not occur on forward walk");
      return i + 1;
    }
  }

  // ---- Prev type: Occupied ----
  if (prev?.type === "occupied") {
    if (next?.type === "available" || next?.type === "category") {
      return bleedIntoNext(slots, i, action);
    }
    if (next?.type === "occupied") {
      return fillCurrentWithAlert(slots, i, action);
    }
    if (next?.type === "travel") {
      travelManager.untrackLeg(action.prevLocation, action.nextLocation);
      logInconsistency("Available with Prev=Occupied, Next=Travel — should not occur on forward walk");
      return i + 1;
    }
  }

  // ---- Prev type: Category (treated as Available per global note) ----
  if (prev?.type === "category") {
    if (next?.type === "available" || next?.type === "category") {
      return bleedAcrossPrevCurrentNext(slots, i, action);
    }
    if (next?.type === "occupied") {
      return bleedIntoPrev(slots, i, action);
    }
    if (next?.type === "travel") {
      travelManager.untrackLeg(action.prevLocation, action.nextLocation);
      logInconsistency("Available with Prev=Category, Next=Travel — should not occur on forward walk");
      return i + 1;
    }
  }

  void bufferTimeMinutes;
  travelManager.untrackLeg(action.prevLocation, action.nextLocation);
  logInconsistency("handleAvailable: unhandled prev/next combination");
  return i + 1;
}

// ---------------------------------------------------------------------------
// Current type: Category — Entry edge then Exit edge
// ---------------------------------------------------------------------------

function handleCategory(
  slots: Slot[],
  i: number,
  travelManager: TravelManager,
  bufferTimeMinutes: number,
): number {
  const afterEntry = handleCategoryEntryEdge(slots, i, travelManager, bufferTimeMinutes);

  if (
    afterEntry >= slots.length ||
    slots[afterEntry].type !== "category"
  ) {
    return afterEntry;
  }

  return handleCategoryExitEdge(slots, afterEntry, travelManager, bufferTimeMinutes);
}

function handleCategoryEntryEdge(
  slots: Slot[],
  i: number,
  travelManager: TravelManager,
  bufferTimeMinutes: number,
): number {
  const slot = slots[i] as CategorySlot;

  // Outer guard: prev != current (null on either side = no transition).
  // Manual check so we don't track a leg we won't end up placing.
  if (
    !slot.prevLocationId ||
    !slot.currentLocationId ||
    slot.prevLocationId === slot.currentLocationId
  ) {
    return i;
  }

  // ---- no prev (i === 0) ----
  if (i === 0) {
    return i;
  }

  const prev = slots[i - 1];

  // ---- Prev type: Travel ----
  if (prev.type === "travel") {
    if (prev.travelToLocationId === slot.currentLocationId) {
      return i;
    }
    logInconsistency(
      `Category entry edge: prev Travel destination ${prev.travelToLocationId} != current ${slot.currentLocationId}`,
    );
    return i;
  }

  // ---- Prev type: Available ----
  if (prev.type === "available") {
    if (i >= 2) {
      const prevPrev = slots[i - 2];
      if (
        prevPrev.type === "travel" &&
        prevPrev.travelToLocationId === slot.currentLocationId
      ) {
        return i;
      }
    }
    logInconsistency(
      "Category entry edge: prev Available without matching Travel at slots[i-2]",
    );
    return i;
  }

  // ---- Prev type: Category ----
  if (prev.type === "category") {
    return i;
  }

  // ---- Prev type: Occupied (different location than current) ----
  if (prev.type === "occupied") {
    const action = travelManager.resolveCategoryEdge(slot, "entry");
    if (!action) return i;

    if (slot.durationMinutes >= action.travelMinutes) {
      return placeTravelAtCategoryHead(slots, i, action);
    }
    return bypassCategoryCascade(slots, i, action, travelManager, bufferTimeMinutes);
  }

  // Unreachable: all Slot type variants are handled above.
  logInconsistency("Category entry edge: unreachable prev case");
  return i;
}

function handleCategoryExitEdge(
  slots: Slot[],
  i: number,
  travelManager: TravelManager,
  bufferTimeMinutes: number,
): number {
  const slot = slots[i] as CategorySlot;

  // Outer guard
  if (
    !slot.currentLocationId ||
    !slot.nextLocationId ||
    slot.currentLocationId === slot.nextLocationId
  ) {
    return i + 1;
  }

  // ---- no next (last slot) ----
  if (i + 1 >= slots.length) {
    markCategoryFinal(slot);
    return i + 1;
  }

  const next = slots[i + 1];

  // ---- Next type: Available ----
  if (next.type === "available") {
    return i + 1;
  }

  // ---- Next type: Category ----
  if (next.type === "category") {
    const action = travelManager.resolveCategoryEdge(slot, "exit");
    if (!action) return i + 1;
    return bleedAcrossCategoryBoundary(slots, i, action, travelManager);
  }

  // ---- Next type: Occupied ----
  if (next.type === "occupied") {
    const action = travelManager.resolveCategoryEdge(slot, "exit");
    if (!action) return i + 1;

    if (slot.durationMinutes >= action.travelMinutes) {
      return placeTravelAtCategoryTail(slots, i, action);
    }

    const prevTravel = findPrevTravelForCategory(slots, i);
    if (prevTravel) {
      return absorbAndReplanThroughCategory(slots, i, action, prevTravel, travelManager);
    }

    return fillCategoryTailOrTrespass(slots, i, action, travelManager);
  }

  // ---- Next type: Travel ----
  if (next.type === "travel") {
    travelManager.untrackLeg(slot.currentLocationId, slot.nextLocationId);
    logInconsistency("Category exit edge: Next=Travel — should not occur on forward walk");
    return i + 1;
  }

  void bufferTimeMinutes;
  logInconsistency("Category exit edge: unhandled next type");
  return i + 1;
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

type PrevTravelMatch = {
  travel: TravelSlot;
  travelIndex: number;
  availableIndex: number | null;
};

// Locate the prev Travel slot for the absorb-and-replan cascade. Handles
// both placeAtSlotStart variants — the Travel may be at slots[i-1] directly,
// or at slots[i-2] across a transparent prev Available leftover.
function findPrevTravelForAvailable(slots: Slot[], i: number): PrevTravelMatch | null {
  if (i < 1) return null;
  const immediate = slots[i - 1];
  if (immediate.type === "travel") {
    const availableIndex =
      i >= 2 && slots[i - 2].type === "available" ? i - 2 : null;
    return { travel: immediate, travelIndex: i - 1, availableIndex };
  }
  if (immediate.type === "available" && i >= 2) {
    const before = slots[i - 2];
    if (before.type === "travel") {
      return { travel: before, travelIndex: i - 2, availableIndex: i - 1 };
    }
  }
  return null;
}

function findPrevTravelForCategory(slots: Slot[], i: number): PrevTravelMatch | null {
  // Same lookup as for Available — the dispatcher reaches the Category exit
  // edge after the walker processed the leading Available, so the Travel is
  // either directly behind or one slot back across a transparent leftover.
  return findPrevTravelForAvailable(slots, i);
}

// ---------------------------------------------------------------------------
// Action: Available, current large enough — PlaceAtStart / PlaceAtEnd
// ---------------------------------------------------------------------------

function placeTravelInCurrent(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
): number {
  const slot = slots[i] as AvailableSlot;
  const { prevLocation, nextLocation, placeAtSlotStart, travelMinutes } = action;

  const travelStart = placeAtSlotStart
    ? slot.start
    : new Date(slot.end.getTime() - travelMinutes * 60000);
  const travelEnd = placeAtSlotStart
    ? new Date(slot.start.getTime() + travelMinutes * 60000)
    : slot.end;

  const travel = createTravelSlot(
    travelStart,
    travelEnd,
    prevLocation,
    nextLocation,
    "preliminary",
    uuidv4(),
  );

  const replacements: Slot[] = [];
  if (placeAtSlotStart) {
    replacements.push(travel);
    if (travelEnd.getTime() < slot.end.getTime()) {
      replacements.push(
        makeAvailableLeftover(slot, travelEnd, slot.end, nextLocation, slot.nextLocationId ?? null),
      );
    }
  } else {
    if (slot.start.getTime() < travelStart.getTime()) {
      replacements.push(
        makeAvailableLeftover(slot, slot.start, travelStart, slot.prevLocationId ?? null, prevLocation),
      );
    }
    replacements.push(travel);
  }

  slots.splice(i, 1, ...replacements);
  return i + replacements.length;
}

// ---------------------------------------------------------------------------
// Action: Category entry — PlaceAtStart (eat from interior at HEAD)
// ---------------------------------------------------------------------------

function placeTravelAtCategoryHead(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
): number {
  const slot = slots[i] as CategorySlot;
  const { prevLocation, nextLocation, travelMinutes } = action;

  const travelStart = slot.start;
  const travelEnd = new Date(travelStart.getTime() + travelMinutes * 60000);

  const travel = createTravelSlot(
    travelStart,
    travelEnd,
    prevLocation,
    nextLocation,
    "preliminary",
    uuidv4(),
    { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
  );

  const replacements: Slot[] = [travel];
  if (travelEnd.getTime() < slot.end.getTime()) {
    replacements.push({
      ...slot,
      start: travelEnd,
      durationMinutes: Math.floor((slot.end.getTime() - travelEnd.getTime()) / 60000),
      prevLocationId: slot.currentLocationId,
      trespassingStart: undefined,
    });
  }

  slots.splice(i, 1, ...replacements);
  // Position walker at the (possibly-shortened) category for exit-edge handling.
  return i + 1;
}

// ---------------------------------------------------------------------------
// Action: Category exit — PlaceAtEnd (eat from interior at TAIL)
// ---------------------------------------------------------------------------

function placeTravelAtCategoryTail(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
): number {
  const slot = slots[i] as CategorySlot;
  const { prevLocation, nextLocation, travelMinutes } = action;

  const travelEnd = slot.end;
  const travelStart = new Date(travelEnd.getTime() - travelMinutes * 60000);

  const travel = createTravelSlot(
    travelStart,
    travelEnd,
    prevLocation,
    nextLocation,
    "preliminary",
    uuidv4(),
    { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
  );

  const replacements: Slot[] = [];
  if (slot.start.getTime() < travelStart.getTime()) {
    replacements.push({
      ...slot,
      end: travelStart,
      durationMinutes: Math.floor((travelStart.getTime() - slot.start.getTime()) / 60000),
      nextLocationId: slot.currentLocationId,
      trespassingEnd: undefined,
      isFinal: undefined,
    });
  }
  replacements.push(travel);

  slots.splice(i, 1, ...replacements);
  return i + replacements.length;
}

// ---------------------------------------------------------------------------
// Action: Available with both neighbors fixed (Occupied), too small — fill + alert
// ---------------------------------------------------------------------------

function fillCurrentWithAlert(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
): number {
  const slot = slots[i] as AvailableSlot;
  const travel = createTravelSlot(
    slot.start,
    slot.end,
    action.prevLocation,
    action.nextLocation,
    "preliminary",
    uuidv4(),
    {
      insufficientTravel: true,
      requiredTravelMinutes: action.travelMinutes,
    },
  );
  slots.splice(i, 1, travel);
  return i + 1;
}

// ---------------------------------------------------------------------------
// Action: Available, fill current, bleed remainder into one neighbor
// ---------------------------------------------------------------------------

function bleedIntoPrev(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
): number {
  return bleedSingleSide(slots, i, action, "prev");
}

function bleedIntoNext(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
): number {
  return bleedSingleSide(slots, i, action, "next");
}

function bleedSingleSide(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  side: "prev" | "next",
): number {
  const slot = slots[i] as AvailableSlot;
  const { prevLocation, nextLocation, travelMinutes } = action;
  const T = travelMinutes;
  const curDur = slot.durationMinutes;
  const neighborIdx = side === "prev" ? i - 1 : i + 1;
  const neighbor = slots[neighborIdx];

  const isNeighborPlaceable =
    neighbor &&
    (neighbor.type === "available" || neighbor.type === "category");

  if (!isNeighborPlaceable) {
    return fillCurrentWithAlert(slots, i, action);
  }

  const neighborDur = neighbor.durationMinutes;
  const overflow = T - curDur;
  const insufficient = overflow > neighborDur;
  const consumeFromNeighbor = insufficient ? neighborDur : overflow;

  // Geometry: travel always ends at slot.end (no legTracker rerouting here —
  // bleed cases just need to consume time, not pick start/end).
  let travelStart: Date;
  let travelEnd: Date;
  if (side === "prev") {
    travelEnd = slot.end;
    travelStart = new Date(slot.start.getTime() - consumeFromNeighbor * 60000);
  } else {
    travelStart = slot.start;
    travelEnd = new Date(slot.end.getTime() + consumeFromNeighbor * 60000);
  }

  const travel = createTravelSlot(
    travelStart,
    travelEnd,
    prevLocation,
    nextLocation,
    "preliminary",
    uuidv4(),
    {
      insufficientTravel: insufficient,
      requiredTravelMinutes: insufficient ? T : 0,
    },
  );

  const neighborConsumed = consumeFromNeighbor >= neighborDur;
  if (side === "prev") {
    return spliceBleedPrev(slots, i, neighborIdx, neighbor, travel, neighborConsumed, travelStart);
  }
  return spliceBleedNext(slots, i, neighborIdx, neighbor, travel, neighborConsumed, travelEnd);
}

function spliceBleedPrev(
  slots: Slot[],
  curIdx: number,
  prevIdx: number,
  prev: Slot,
  travel: TravelSlot,
  prevConsumed: boolean,
  travelStart: Date,
): number {
  // Replace [prev, current] with [shortened prev?, travel]. Trespass only
  // fires when the category interior is FULLY consumed — partial bleeds
  // just shorten the category without marking a boundary.
  const replacements: Slot[] = [];

  if (!prevConsumed && (prev.type === "available" || prev.type === "category")) {
    replacements.push(
      shortenPlaceableAtEnd(prev, travelStart, travel.travelFromLocationId),
    );
  } else if (prevConsumed && prev.type === "category") {
    travel.consumedCategoryIds = (travel.consumedCategoryIds ?? []).concat(prev.categoryId);
  }

  replacements.push(travel);
  slots.splice(prevIdx, curIdx - prevIdx + 1, ...replacements);
  return prevIdx + replacements.length;
}

function spliceBleedNext(
  slots: Slot[],
  curIdx: number,
  nextIdx: number,
  next: Slot,
  travel: TravelSlot,
  nextConsumed: boolean,
  travelEnd: Date,
): number {
  // Replace [current, next] with [travel, shortened next?]. Trespass only
  // on full consumption (see spliceBleedPrev for rationale).
  const replacements: Slot[] = [travel];

  if (!nextConsumed && (next.type === "available" || next.type === "category")) {
    replacements.push(
      shortenPlaceableAtStart(next, travelEnd, travel.travelToLocationId),
    );
  } else if (nextConsumed && next.type === "category") {
    travel.consumedCategoryIds = (travel.consumedCategoryIds ?? []).concat(next.categoryId);
  }

  slots.splice(curIdx, nextIdx - curIdx + 1, ...replacements);
  // Travel is always at curIdx; walker lands on the shortened-next (if any)
  // so a Category neighbor's exit edge can fire on the next iteration.
  return curIdx + 1;
}

// ---------------------------------------------------------------------------
// Action: Available, fill current, bleed into both neighbors (3-slot)
// ---------------------------------------------------------------------------

function bleedAcrossPrevCurrentNext(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
): number {
  const slot = slots[i] as AvailableSlot;
  const prev = slots[i - 1];
  const next = slots[i + 1];

  const T = action.travelMinutes;
  const curDur = slot.durationMinutes;
  const prevDur = prev.durationMinutes;
  const nextDur = next.durationMinutes;
  const excess = T - curDur;
  const half = excess / 2;

  let bleedPrev: number;
  let bleedNext: number;
  let insufficient = false;

  if (excess <= prevDur + nextDur) {
    if (half <= prevDur && half <= nextDur) {
      bleedPrev = half;
      bleedNext = half;
    } else if (prevDur < nextDur) {
      bleedPrev = prevDur;
      bleedNext = excess - prevDur;
    } else {
      bleedNext = nextDur;
      bleedPrev = excess - nextDur;
    }
  } else {
    bleedPrev = prevDur;
    bleedNext = nextDur;
    insufficient = true;
  }

  const travelStart = new Date(slot.start.getTime() - bleedPrev * 60000);
  const travelEnd = new Date(slot.end.getTime() + bleedNext * 60000);

  const travel = createTravelSlot(
    travelStart,
    travelEnd,
    action.prevLocation,
    action.nextLocation,
    "preliminary",
    uuidv4(),
    {
      insufficientTravel: insufficient,
      requiredTravelMinutes: insufficient ? T : 0,
    },
  );

  const replacements: Slot[] = [];

  const prevConsumed = bleedPrev >= prevDur;
  if (!prevConsumed && (prev.type === "available" || prev.type === "category")) {
    replacements.push(shortenPlaceableAtEnd(prev, travelStart, travel.travelFromLocationId));
  } else if (prevConsumed && prev.type === "category") {
    travel.consumedCategoryIds = (travel.consumedCategoryIds ?? []).concat(prev.categoryId);
  }

  replacements.push(travel);

  const nextConsumed = bleedNext >= nextDur;
  if (!nextConsumed && (next.type === "available" || next.type === "category")) {
    replacements.push(shortenPlaceableAtStart(next, travelEnd, travel.travelToLocationId));
  } else if (nextConsumed && next.type === "category") {
    travel.consumedCategoryIds = (travel.consumedCategoryIds ?? []).concat(next.categoryId);
  }

  const travelIdx = replacements.indexOf(travel);
  slots.splice(i - 1, 3, ...replacements);
  // Walker lands on the first slot AFTER the travel — typically the
  // shortened-next so it can be processed on the next iteration.
  return i - 1 + travelIdx + 1;
}

// ---------------------------------------------------------------------------
// Action: Category exit, Next=Occupied, doesn't fit, no backward Travel
// ---------------------------------------------------------------------------

function fillCategoryTailOrTrespass(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  travelManager: TravelManager,
): number {
  const slot = slots[i] as CategorySlot;
  const T = action.travelMinutes;
  const curDur = slot.durationMinutes;

  if (T >= curDur) {
    // Entire interior consumed -> trespass instead of visible travel.
    slot.trespassingEnd = true;
    travelManager.untrackLeg(action.prevLocation, action.nextLocation);
    return i + 1;
  }

  // Otherwise fill the category TAIL with an alert travel.
  const travelEnd = slot.end;
  const travelStart = new Date(travelEnd.getTime() - curDur * 60000);
  const fillMinutes = curDur;
  const travel = createTravelSlot(
    travelStart,
    travelEnd,
    action.prevLocation,
    action.nextLocation,
    "preliminary",
    uuidv4(),
    {
      insufficientTravel: true,
      requiredTravelMinutes: T,
      categoryId: slot.categoryId,
      isStrictCategory: slot.isStrictCategory,
    },
  );
  void fillMinutes;

  const replacements: Slot[] = [];
  if (slot.start.getTime() < travelStart.getTime()) {
    replacements.push({
      ...slot,
      end: travelStart,
      durationMinutes: Math.floor((travelStart.getTime() - slot.start.getTime()) / 60000),
      nextLocationId: slot.currentLocationId,
      trespassingEnd: undefined,
      isFinal: undefined,
    });
  }
  replacements.push(travel);

  slots.splice(i, 1, ...replacements);
  return i + replacements.length;
}

// ---------------------------------------------------------------------------
// Action: Available with Prev=Travel, absorb-and-bleed across 3 slots
// ---------------------------------------------------------------------------

function absorbAndBleedAcross(
  slots: Slot[],
  i: number,
  originalAction: TravelProcessingAction,
  prevTravel: PrevTravelMatch,
  next: Slot,
  travelManager: TravelManager,
): number {
  // Undo the resolveTravel-tracked leg and the prev Travel's leg.
  travelManager.untrackLeg(originalAction.prevLocation, originalAction.nextLocation);
  const oldFrom = prevTravel.travel.travelFromLocationId;
  const oldTo = prevTravel.travel.travelToLocationId;
  if (oldFrom && oldTo) travelManager.untrackLeg(oldFrom, oldTo);

  // Plan A -> C, where A = prev Travel's origin, C = current.nextLocation.
  const A = prevTravel.travel.travelFromLocationId;
  const C = originalAction.nextLocation;
  if (!A) return fillCurrentWithAlert(slots, i, originalAction);

  const slot = slots[i] as AvailableSlot;
  const referenceTime = slot.end;
  const newDuration = travelManager.getTravelTime(A, C, referenceTime);
  if (newDuration <= 0) return fillCurrentWithAlert(slots, i, originalAction);
  travelManager.trackLeg(A, C);

  // Merge prev Available leftover and prev Travel into one extended Available.
  // Combined region runs from prevAvailable.start (if any, else prevTravel.start) to current.end.
  const prevAvailable =
    prevTravel.availableIndex !== null
      ? (slots[prevTravel.availableIndex] as AvailableSlot)
      : null;
  const regionStart = prevAvailable?.start ?? prevTravel.travel.start;
  const regionEnd = slot.end;
  const regionStartMs = regionStart.getTime();
  const regionEndMs = regionEnd.getTime();

  // Place new Travel at the END of the region (filling current, bleeding back).
  const travelStartMs = Math.max(regionStartMs, regionEndMs - newDuration * 60000);
  const insufficient = regionEndMs - regionStartMs < newDuration * 60000;
  const travelStart = new Date(travelStartMs);
  const travelEnd = regionEnd;

  const travel = createTravelSlot(
    travelStart,
    travelEnd,
    A,
    C,
    "preliminary",
    uuidv4(),
    {
      insufficientTravel: insufficient,
      requiredTravelMinutes: newDuration,
      overconstrained: true,
    },
  );

  const replacements: Slot[] = [];
  if (regionStartMs < travelStartMs) {
    replacements.push({
      type: "available",
      start: regionStart,
      end: travelStart,
      durationMinutes: Math.floor((travelStartMs - regionStartMs) / 60000),
      prevLocationId: prevAvailable?.prevLocationId ?? A,
      nextLocationId: A,
    });
  }
  replacements.push(travel);

  // Optional: also consume part of next slot if there's leftover space.
  // For simplicity, leave the next slot alone — only the region [regionStart, regionEnd]
  // is affected here. The walker will visit next on the following iteration.
  void next;

  const firstIdx = prevTravel.availableIndex ?? prevTravel.travelIndex;
  const removeCount = i - firstIdx + 1;
  slots.splice(firstIdx, removeCount, ...replacements);
  return firstIdx + replacements.length;
}

// ---------------------------------------------------------------------------
// Action: Available with Prev=Travel, Next=Occupied — absorb and replan A->C
// ---------------------------------------------------------------------------

function absorbAndReplanBackward(
  slots: Slot[],
  i: number,
  originalAction: TravelProcessingAction,
  prevTravel: PrevTravelMatch,
  travelManager: TravelManager,
): number {
  // Same shape as absorbAndBleedAcross — current is Available, next is
  // Occupied. The new A->C travel ends at current.end (= next.start) and
  // fills current + bleeds backward into the merged prev region.
  travelManager.untrackLeg(originalAction.prevLocation, originalAction.nextLocation);
  const oldFrom = prevTravel.travel.travelFromLocationId;
  const oldTo = prevTravel.travel.travelToLocationId;
  if (oldFrom && oldTo) travelManager.untrackLeg(oldFrom, oldTo);

  const A = prevTravel.travel.travelFromLocationId;
  const C = originalAction.nextLocation;
  if (!A) return fillCurrentWithAlert(slots, i, originalAction);

  const slot = slots[i] as AvailableSlot;
  const newDuration = travelManager.getTravelTime(A, C, slot.end);
  if (newDuration <= 0) return fillCurrentWithAlert(slots, i, originalAction);
  travelManager.trackLeg(A, C);

  const prevAvailable =
    prevTravel.availableIndex !== null
      ? (slots[prevTravel.availableIndex] as AvailableSlot)
      : null;
  const regionStart = prevAvailable?.start ?? prevTravel.travel.start;
  const regionEnd = slot.end;
  const regionStartMs = regionStart.getTime();
  const regionEndMs = regionEnd.getTime();

  const travelStartMs = Math.max(regionStartMs, regionEndMs - newDuration * 60000);
  const insufficient = regionEndMs - regionStartMs < newDuration * 60000;
  const travelStart = new Date(travelStartMs);
  const travelEnd = regionEnd;

  const travel = createTravelSlot(
    travelStart,
    travelEnd,
    A,
    C,
    "preliminary",
    uuidv4(),
    {
      insufficientTravel: insufficient,
      requiredTravelMinutes: newDuration,
    },
  );

  const replacements: Slot[] = [];
  if (regionStartMs < travelStartMs) {
    replacements.push({
      type: "available",
      start: regionStart,
      end: travelStart,
      durationMinutes: Math.floor((travelStartMs - regionStartMs) / 60000),
      prevLocationId: prevAvailable?.prevLocationId ?? A,
      nextLocationId: A,
    });
  }
  replacements.push(travel);

  const firstIdx = prevTravel.availableIndex ?? prevTravel.travelIndex;
  const removeCount = i - firstIdx + 1;
  slots.splice(firstIdx, removeCount, ...replacements);
  return firstIdx + replacements.length;
}

// ---------------------------------------------------------------------------
// Action: Category exit, Prev=Travel, doesn't fit — absorb + replan through category
// ---------------------------------------------------------------------------

function absorbAndReplanThroughCategory(
  slots: Slot[],
  i: number,
  originalAction: TravelProcessingAction,
  prevTravel: PrevTravelMatch,
  travelManager: TravelManager,
): number {
  // Undo the resolveCategoryEdge-tracked leg (B -> C) and the prev Travel's
  // leg (A -> B). Then plan A -> C.
  travelManager.untrackLeg(originalAction.prevLocation, originalAction.nextLocation);
  const oldFrom = prevTravel.travel.travelFromLocationId;
  const oldTo = prevTravel.travel.travelToLocationId;
  if (oldFrom && oldTo) travelManager.untrackLeg(oldFrom, oldTo);

  const category = slots[i] as CategorySlot;
  const A = prevTravel.travel.travelFromLocationId;
  const C = originalAction.nextLocation;
  if (!A) {
    return fillCategoryTailOrTrespass(slots, i, originalAction, travelManager);
  }

  const newDuration = travelManager.getTravelTime(A, C, category.end);
  if (newDuration <= 0) {
    return fillCategoryTailOrTrespass(slots, i, originalAction, travelManager);
  }
  travelManager.trackLeg(A, C);

  const prevAvailable =
    prevTravel.availableIndex !== null
      ? (slots[prevTravel.availableIndex] as AvailableSlot)
      : null;
  const regionStart = prevAvailable?.start ?? prevTravel.travel.start;
  const regionEnd = category.end;
  const regionStartMs = regionStart.getTime();
  const regionEndMs = regionEnd.getTime();

  const travelStartMs = Math.max(regionStartMs, regionEndMs - newDuration * 60000);
  const insufficient = regionEndMs - regionStartMs < newDuration * 60000;
  const travelStart = new Date(travelStartMs);
  const travelEnd = regionEnd;

  const travel = createTravelSlot(
    travelStart,
    travelEnd,
    A,
    C,
    "preliminary",
    uuidv4(),
    {
      insufficientTravel: insufficient,
      requiredTravelMinutes: newDuration,
      overconstrained: true,
    },
  );
  travel.consumedCategoryIds = [category.categoryId];

  const replacements: Slot[] = [];
  if (regionStartMs < travelStartMs) {
    replacements.push({
      type: "available",
      start: regionStart,
      end: travelStart,
      durationMinutes: Math.floor((travelStartMs - regionStartMs) / 60000),
      prevLocationId: prevAvailable?.prevLocationId ?? A,
      nextLocationId: A,
    });
  }
  replacements.push(travel);

  // Remove [prevAvailable?, prevTravel, ..., category] in one splice.
  const firstIdx = prevTravel.availableIndex ?? prevTravel.travelIndex;
  const removeCount = i - firstIdx + 1;
  slots.splice(firstIdx, removeCount, ...replacements);
  return firstIdx + replacements.length;
}

// ---------------------------------------------------------------------------
// Action: Category entry, Prev=Occupied, doesn't fit — bypass cascade
// ---------------------------------------------------------------------------

function bypassCategoryCascade(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  travelManager: TravelManager,
  bufferTimeMinutes: number,
): number {
  void bufferTimeMinutes;
  // Replace the category with a single Travel slot from prev->slots[i+1].
  // Travel duration uses getTravelTime(prev.location, post-category location).
  // The original resolveCategoryEdge leg (prev -> currentLocationId) is
  // untracked because we're routing differently.
  travelManager.untrackLeg(action.prevLocation, action.nextLocation);

  const category = slots[i] as CategorySlot;
  const postCategoryLocation = nextSlotLocation(slots, i + 1);
  if (!postCategoryLocation) {
    return fillCategoryTailOrTrespass(slots, i, action, travelManager);
  }

  const newDuration = travelManager.getTravelTime(
    action.prevLocation,
    postCategoryLocation,
    category.end,
  );
  if (newDuration <= 0) {
    return fillCategoryTailOrTrespass(slots, i, action, travelManager);
  }
  travelManager.trackLeg(action.prevLocation, postCategoryLocation);

  // Place travel filling the category interior. If newDuration > category
  // duration, mark insufficient (future work: cascade into next+1).
  const travel = createTravelSlot(
    category.start,
    category.end,
    action.prevLocation,
    postCategoryLocation,
    "preliminary",
    uuidv4(),
    {
      insufficientTravel: newDuration > category.durationMinutes,
      requiredTravelMinutes: newDuration,
    },
  );
  travel.consumedCategoryIds = [category.categoryId];

  slots.splice(i, 1, travel);
  return i + 1;
}

// ---------------------------------------------------------------------------
// Action: Category exit, Next=Category — bleed across cat-to-cat boundary
// ---------------------------------------------------------------------------

function bleedAcrossCategoryBoundary(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  travelManager: TravelManager,
): number {
  const current = slots[i] as CategorySlot;
  const next = slots[i + 1] as CategorySlot;
  const T = action.travelMinutes;
  const curDur = current.durationMinutes;
  const nextDur = next.durationMinutes;

  // If symmetric placement won't fit (one side would be fully consumed),
  // prefer trespass over forced asymmetric placement. Forced asymmetric
  // cascades through later handlers: the surviving sliver of the squeezed
  // category gets eaten by the next transition, producing a chain of
  // overlapping travels that visually obliterates the categories. Better
  // to mark the boundary trespass and let the next handler operate on
  // the unshortened categories. Combined-too-small (T > curDur + nextDur)
  // falls into the same path.
  const half = T / 2;
  if (half >= curDur || half >= nextDur) {
    travelManager.untrackLeg(action.prevLocation, action.nextLocation);
    current.trespassingEnd = true;
    next.trespassingStart = true;
    return i + 1;
  }

  // Symmetric bleed.
  const bleedCurrent = half;
  const bleedNext = half;

  const travelStart = new Date(current.end.getTime() - bleedCurrent * 60000);
  const travelEnd = new Date(next.start.getTime() + bleedNext * 60000);

  const travel = createTravelSlot(
    travelStart,
    travelEnd,
    action.prevLocation,
    action.nextLocation,
    "preliminary",
    uuidv4(),
  );

  const replacements: Slot[] = [];

  const currentConsumed = bleedCurrent >= curDur;
  if (!currentConsumed) {
    replacements.push({
      ...current,
      end: travelStart,
      durationMinutes: Math.floor((travelStart.getTime() - current.start.getTime()) / 60000),
      nextLocationId: current.currentLocationId,
      isFinal: undefined,
    });
  } else {
    travel.consumedCategoryIds = (travel.consumedCategoryIds ?? []).concat(current.categoryId);
  }

  replacements.push(travel);

  const nextConsumed = bleedNext >= nextDur;
  if (!nextConsumed) {
    replacements.push({
      ...next,
      start: travelEnd,
      durationMinutes: Math.floor((next.end.getTime() - travelEnd.getTime()) / 60000),
      prevLocationId: next.currentLocationId,
    });
  } else {
    travel.consumedCategoryIds = (travel.consumedCategoryIds ?? []).concat(next.categoryId);
  }

  const travelIdx = replacements.indexOf(travel);
  slots.splice(i, 2, ...replacements);
  // Walker lands on the first slot AFTER the travel — typically the
  // shortened-next category so its exit edge can fire on the next iteration.
  return i + travelIdx + 1;
}

// ---------------------------------------------------------------------------
// Action: mark final on last-slot category
// ---------------------------------------------------------------------------

function markCategoryFinal(slot: CategorySlot): void {
  slot.isFinal = true;
}

// ---------------------------------------------------------------------------
// Logging stub
// ---------------------------------------------------------------------------

function logInconsistency(message: string): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[preliminaryTravelPass] ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Slot-shape utilities (file-local)
// ---------------------------------------------------------------------------

function makeAvailableLeftover(
  source: AvailableSlot,
  start: Date,
  end: Date,
  prevLocationId: string | null,
  nextLocationId: string | null,
): AvailableSlot {
  void source;
  return {
    type: "available",
    start,
    end,
    durationMinutes: Math.floor((end.getTime() - start.getTime()) / 60000),
    prevLocationId,
    nextLocationId,
  };
}

function shortenPlaceableAtEnd(
  source: AvailableSlot | CategorySlot,
  newEnd: Date,
  newNextLocationId: string | null,
): AvailableSlot | CategorySlot {
  if (source.type === "category") {
    return {
      ...source,
      end: newEnd,
      durationMinutes: Math.floor((newEnd.getTime() - source.start.getTime()) / 60000),
      nextLocationId: newNextLocationId,
      trespassingEnd: undefined,
      isFinal: undefined,
    };
  }
  return {
    ...source,
    end: newEnd,
    durationMinutes: Math.floor((newEnd.getTime() - source.start.getTime()) / 60000),
    nextLocationId: newNextLocationId,
  };
}

function shortenPlaceableAtStart(
  source: AvailableSlot | CategorySlot,
  newStart: Date,
  newPrevLocationId: string | null,
): AvailableSlot | CategorySlot {
  if (source.type === "category") {
    return {
      ...source,
      start: newStart,
      durationMinutes: Math.floor((source.end.getTime() - newStart.getTime()) / 60000),
      prevLocationId: newPrevLocationId,
      trespassingStart: undefined,
    };
  }
  return {
    ...source,
    start: newStart,
    durationMinutes: Math.floor((source.end.getTime() - newStart.getTime()) / 60000),
    prevLocationId: newPrevLocationId,
  };
}

function nextSlotLocation(slots: Slot[], idx: number): string | null {
  const s = slots[idx];
  if (!s) return null;
  if (s.type === "occupied") {
    // Occupied slots don't carry a location field directly; the dispatcher
    // relies on adjacent placeable slots' prev/next. For bypass routing we
    // approximate via the slot's eventId-paired location (not modeled here),
    // so return null and let the caller fall through to the trespass path.
    return null;
  }
  if (s.type === "available") return s.prevLocationId ?? s.nextLocationId ?? null;
  if (s.type === "category") return s.currentLocationId;
  if (s.type === "travel") return s.travelFromLocationId;
  return null;
}
