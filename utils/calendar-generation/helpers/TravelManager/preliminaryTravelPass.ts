import { Category } from "@/types/prisma";
import { AvailableSlot, CategorySlot, Slot } from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";

/**
 * Walks slots[] in order and places travel slots for location transitions.
 * Implements the decision tree in notes/claudeTravelCriteria.md.
 *
 * Trespass markers are set directly on CategorySlot fragments
 * (trespassingStart / trespassingEnd) so downstream wrapper-marking can
 * read them from the slot array without a side-channel.
 *
 * Iteration: each handler returns the next index to process. The walker
 * uses a while-loop and advances by setting i to the handler's return
 * value, so newly inserted slots don't get re-processed.
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
  const action = travelManager.resolveTravel(slot);
  if (!action) return i + 1;

  const { prevLocation, nextLocation, placeAtSlotStart, travelMinutes } = action;
  void prevLocation;
  void nextLocation;
  void placeAtSlotStart;

  // Current size: large enough for travel
  if (slot.durationMinutes >= travelMinutes) {
    // -> PlaceAtStart  (placeAtSlotStart === true, return trip)
    // -> PlaceAtEnd    (placeAtSlotStart === false, forward)
    return placeTravelInCurrent(slots, i, action, bufferTimeMinutes);
  }

  // Current size: not large enough for travel — discriminate by Prev/Next type.
  const prev = i > 0 ? slots[i - 1] : null;
  const next = i + 1 < slots.length ? slots[i + 1] : null;

  // ---- Prev type: Available ----
  if (prev?.type === "available") {
    if (next?.type === "available") {
      // Travel can bleed symmetrically? Else asymmetric? Else fillAll+alert?
      return bleedAcrossPrevCurrentNext(slots, i, action, bufferTimeMinutes);
    }
    if (next?.type === "category") {
      // Per global note: same as Next=Available, with trespass marking.
      return bleedAcrossPrevCurrentNext(slots, i, action, bufferTimeMinutes);
    }
    if (next?.type === "occupied") {
      // Prev+current large enough -> fill current, remainder to prev.
      // Otherwise -> fill both + alert.
      return bleedIntoPrev(slots, i, action, bufferTimeMinutes);
    }
    if (next?.type === "travel") {
      logInconsistency("Available with Prev=Available, Next=Travel — should not occur on forward walk");
      return i + 1;
    }
  }

  // ---- Prev type: Occupied ----
  if (prev?.type === "occupied") {
    if (next?.type === "available") {
      // Next+current large enough -> fill current, remainder to next.
      // Otherwise -> fill both + alert.
      return bleedIntoNext(slots, i, action, bufferTimeMinutes);
    }
    if (next?.type === "category") {
      // Per global note: same as Next=Available + trespass on full consumption.
      return bleedIntoNext(slots, i, action, bufferTimeMinutes);
    }
    if (next?.type === "occupied") {
      // -> Fill current, schedule travel as 'alert'.
      return fillCurrentWithAlert(slots, i, action, bufferTimeMinutes);
    }
    if (next?.type === "travel") {
      logInconsistency("Available with Prev=Occupied, Next=Travel — should not occur on forward walk");
      return i + 1;
    }
  }

  // ---- Prev type: Travel ----
  // (slots[i-1] is Travel directly, OR slots[i-2] is Travel across a
  // transparent prev Available — placeAtSlotStart=true variant.)
  if (prev?.type === "travel" || (prev?.type === "available" && i >= 2 && slots[i - 2].type === "travel")) {
    // Prev + current large enough -> Absorb prev travel A-B, plan new A-C in current.
    // Not large enough combined -> sub-discriminator by Next type:
    if (next?.type === "available") {
      return absorbAndBleedAcross(slots, i, action, bufferTimeMinutes);
    }
    if (next?.type === "category") {
      // Per global note: same as Next=Available + trespass on full consumption.
      return absorbAndBleedAcross(slots, i, action, bufferTimeMinutes);
    }
    if (next?.type === "occupied") {
      // Backward-absorb routing: undo prev Travel, replan A->C ending at next.start.
      return absorbAndReplanBackward(slots, i, action, bufferTimeMinutes);
    }
    if (next?.type === "travel") {
      logInconsistency("Available with Prev=Travel, Next=Travel — should not occur on forward walk");
      return i + 1;
    }
  }

  // ---- Prev type: Category (treated as Available per global note) ----
  if (prev?.type === "category") {
    if (next?.type === "available" || next?.type === "category") {
      return bleedAcrossPrevCurrentNext(slots, i, action, bufferTimeMinutes);
    }
    if (next?.type === "occupied") {
      return bleedIntoPrev(slots, i, action, bufferTimeMinutes);
    }
    if (next?.type === "travel") {
      logInconsistency("Available with Prev=Category, Next=Travel — should not occur on forward walk");
      return i + 1;
    }
  }

  // ---- No prev (i === 0) ----
  // Outer guard already requires prev != next; if prev is null/Anywhere the
  // guard collapses to false and we returned earlier. Reach here only via
  // unhandled type combinations.
  logInconsistency(`handleAvailable: unhandled (prev=${prev?.type ?? "null"}, next=${next?.type ?? "null"})`);
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

  // Entry's bypass cascade can replace the CategorySlot with a Travel slot.
  // Only run exit edge if the slot at afterEntry is still a Category.
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

  // Outer guard: prev != current (null = no transition).
  const action = travelManager.resolveCategoryEdge(slot, "entry");
  if (!action) return i;

  // ---- no prev (i === 0) ----
  if (i === 0) {
    // -> Skip (assume the user is at current location).
    return i;
  }

  const prev = slots[i - 1];

  // ---- Prev type: Travel ----
  if (prev.type === "travel") {
    if (prev.travelToLocationId === slot.currentLocationId) {
      // -> Skip (already placed by leading Available walker or earlier
      //    category's exit edge in a category-to-category boundary).
      return i;
    }
    logInconsistency(`Category entry edge: prev Travel destination ${prev.travelToLocationId} != current ${slot.currentLocationId}`);
    return i;
  }

  // ---- Prev type: Available ----
  if (prev.type === "available") {
    // slots[i-1] is Travel ending at current?  (won't happen — prev is Available)
    // slots[i-1] is Available and slots[i-2] is Travel ending at current -> Skip.
    if (i >= 2 && slots[i - 2].type === "travel") {
      const prevPrev = slots[i - 2];
      if (prevPrev.type === "travel" && prevPrev.travelToLocationId === slot.currentLocationId) {
        return i;
      }
    }
    logInconsistency(`Category entry edge: prev Available without matching Travel at i-2`);
    return i;
  }

  // ---- Prev type: Category ----
  if (prev.type === "category") {
    // -> Skip (previous category's exit edge handled the transition).
    return i;
  }

  // ---- Prev type: Occupied (different location than current) ----
  if (prev.type === "occupied") {
    // Travel prev->current fits in category HEAD?
    if (slot.durationMinutes >= action.travelMinutes) {
      // -> PlaceAtStart (eats from category interior).
      return placeTravelAtCategoryHead(slots, i, action, bufferTimeMinutes);
    }
    // Bypass cascade — route prev->slots[i+1] through the category interior.
    // Mirrors the Available "Next is uncategorized, doesn't fit" cascade.
    return bypassCategoryCascade(slots, i, action, bufferTimeMinutes);
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

  // Outer guard: current != next (null = no transition).
  const action = travelManager.resolveCategoryEdge(slot, "exit");
  if (!action) return i + 1;

  // ---- no next (last slot) ----
  if (i + 1 >= slots.length) {
    // -> Mark slot as 'final' (signal for re-expansion). Skip exit travel.
    markCategoryFinal(slot);
    return i + 1;
  }

  const next = slots[i + 1];

  // ---- Next type: Available ----
  if (next.type === "available") {
    // -> Defer (walker handles slots[i+1] under "Current type: Available").
    return i + 1;
  }

  // ---- Next type: Category — cat-to-cat boundary ----
  if (next.type === "category") {
    // Symmetric / asymmetric bleed across boundary; or extend forward
    // through Next+1 if combined space isn't enough; multi-category hard
    // stop sets trespass flags on each consumed CategorySlot.
    return bleedAcrossCategoryBoundary(slots, i, action, bufferTimeMinutes);
  }

  // ---- Next type: Occupied (different location than current) ----
  if (next.type === "occupied") {
    if (slot.durationMinutes >= action.travelMinutes) {
      // -> PlaceAtEnd (eats from category interior).
      return placeTravelAtCategoryTail(slots, i, action, bufferTimeMinutes);
    }

    // Travel doesn't fit in category TAIL — sub-discriminator by Prev type.
    const prev = i > 0 ? slots[i - 1] : null;

    // Prev type: Travel (slots[i-1] directly OR slots[i-2] across a
    // transparent prev Available).
    const prevIsTravel = prev?.type === "travel";
    const prevPrevIsTravel = prev?.type === "available" && i >= 2 && slots[i - 2].type === "travel";

    if (prevIsTravel || prevPrevIsTravel) {
      // Backward absorb-and-replan: undo prev Travel, route A->C placed at
      // current TAIL filling category + bleeding into restored Available.
      return absorbAndReplanThroughCategory(slots, i, action, bufferTimeMinutes);
    }

    if (prev?.type === "available" || prev?.type === "occupied" || prev?.type === "category") {
      // No backward Travel to absorb. Fill TAIL + alert, OR trespassingEnd
      // if interior fully consumed.
      return fillCategoryTailOrTrespass(slots, i, action, bufferTimeMinutes);
    }

    // Unreachable: prev is either null (handled by the boolean branches
    // above) or one of the four Slot type variants (all covered).
    logInconsistency("Category exit edge Next=Occupied: unreachable prev case");
    return i + 1;
  }

  // ---- Next type: Travel ----
  if (next.type === "travel") {
    logInconsistency("Category exit edge: Next=Travel — should not occur on forward walk");
    return i + 1;
  }

  logInconsistency(`Category exit edge: unhandled next type`);
  return i + 1;
}

// ---------------------------------------------------------------------------
// Action stubs — to be implemented one by one. Each mutates slots[] in
// place and returns the next index for the walker to process.
// ---------------------------------------------------------------------------

import { TravelProcessingAction } from "../../models/SchedulingModels";

function placeTravelInCurrent(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  bufferTimeMinutes: number,
): number {
  // TODO: PlaceAtStart or PlaceAtEnd inside an Available slot (action.placeAtSlotStart)
  void slots;
  void action;
  void bufferTimeMinutes;
  return i + 1;
}

function bleedAcrossPrevCurrentNext(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  bufferTimeMinutes: number,
): number {
  // TODO: symmetric / asymmetric / fillAll+alert across prev/current/next.
  // Categories among prev/next get trespass flags on full consumption.
  void slots;
  void action;
  void bufferTimeMinutes;
  return i + 1;
}

function bleedIntoPrev(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  bufferTimeMinutes: number,
): number {
  // TODO: fill current, remainder to prev. Alert if combined too small.
  // If prev is a Category and gets fully consumed, set its trespassingEnd.
  void slots;
  void action;
  void bufferTimeMinutes;
  return i + 1;
}

function bleedIntoNext(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  bufferTimeMinutes: number,
): number {
  // TODO: fill current, remainder to next. Alert if combined too small.
  // If next is a Category and gets fully consumed, set its trespassingStart.
  void slots;
  void action;
  void bufferTimeMinutes;
  return i + 1;
}

function fillCurrentWithAlert(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  bufferTimeMinutes: number,
): number {
  // TODO: fill current entirely, mark insufficientTravel=true.
  void slots;
  void action;
  void bufferTimeMinutes;
  return i + 1;
}

function absorbAndBleedAcross(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  bufferTimeMinutes: number,
): number {
  // TODO: absorb prev Travel back into Available, plan new A->C, bleed
  // symmetrically/asymmetrically across prev/current/next. Categories among
  // prev/next get trespass flags on full consumption.
  void slots;
  void action;
  void bufferTimeMinutes;
  return i + 1;
}

function absorbAndReplanBackward(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  bufferTimeMinutes: number,
): number {
  // TODO: absorb prev Travel, plan new A->C ending at next.start, filling
  // current and bleeding backward into restored Available. No category
  // involvement here (current is Available).
  void slots;
  void action;
  void bufferTimeMinutes;
  return i + 1;
}

function placeTravelAtCategoryHead(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  bufferTimeMinutes: number,
): number {
  // TODO: PlaceAtStart of a CategorySlot, eating from category interior.
  // Walker advances to the shortened category at i+1 for the exit edge.
  void slots;
  void action;
  void bufferTimeMinutes;
  return i + 1;
}

function placeTravelAtCategoryTail(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  bufferTimeMinutes: number,
): number {
  // TODO: PlaceAtEnd of a CategorySlot, eating from category interior.
  void slots;
  void action;
  void bufferTimeMinutes;
  return i + 1;
}

function bypassCategoryCascade(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  bufferTimeMinutes: number,
): number {
  // TODO: route a single travel from prev to slots[i+1] through the category
  // interior. Cascade forward (Next+1, Next+2) if needed. Mark trespass on
  // any consumed category. The category at i may be fully replaced by Travel
  // (bypass) — caller's handleCategory checks slot type after this returns.
  void slots;
  void action;
  void bufferTimeMinutes;
  return i + 1;
}

function bleedAcrossCategoryBoundary(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  bufferTimeMinutes: number,
): number {
  // TODO: cat-to-cat boundary placement. Symmetric/asymmetric bleed across
  // current TAIL and next HEAD. If combined too small, extend forward
  // (Next+1, Next+2). Multi-category full consumption -> trespass flags.
  void slots;
  void action;
  void bufferTimeMinutes;
  return i + 1;
}

function absorbAndReplanThroughCategory(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  bufferTimeMinutes: number,
): number {
  // TODO: backward absorb-and-replan for category exit edge.
  // - Absorb prev Travel back into adjacent Available
  // - Compute new A->C travel
  // - Place at category TAIL, fill current entirely, bleed into restored Available
  // - Mark new travel as overconstrained: true
  // - Set trespassingStart AND trespassingEnd on this CategorySlot
  // - If A->C still doesn't fit, also mark insufficientTravel: true
  void slots;
  void action;
  void bufferTimeMinutes;
  return i + 1;
}

function fillCategoryTailOrTrespass(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  bufferTimeMinutes: number,
): number {
  // TODO: fill category TAIL with travel + alert, OR if entire interior
  // is consumed: set trespassingEnd on this CategorySlot instead of
  // emitting a visible travel slot.
  void slots;
  void action;
  void bufferTimeMinutes;
  return i + 1;
}

function markCategoryFinal(slot: CategorySlot): void {
  // TODO: signal the slot is the last in slots[] so the generator knows
  // to re-expand templates and resume here. Probably a new flag on
  // CategorySlot (e.g. `isFinal?: boolean`) added when the time comes.
  void slot;
}

function logInconsistency(message: string): void {
  // TODO: route through the project's logging utility. For now console.warn.
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[preliminaryTravelPass] ${message}`);
  }
}
