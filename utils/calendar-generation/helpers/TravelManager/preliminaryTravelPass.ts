import { Category } from "@/types/prisma";
import {
  AvailableSlot,
  CategorySlot,
  OccupiedSlot,
  Slot,
  TravelSlot,
} from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";
import { TravelProcessingAction } from "../../models/SchedulingModels";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { expandSlotForDay } from "../TimeSlotManager/expandSlotForDay";
import { TravelPassRecorder } from "./TravelPassRecorder";
import { M } from "./travelPassMessages";
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
  recorder?: TravelPassRecorder,
): void {
  if (!hasLocationMap) return;

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
      recorder?.endSlot(slots);
      continue;
    }

    if (slot.type === "category") {
      i = handleCategory(slots, i, travelManager, categories, recorder);
      recorder?.endSlot(slots);
      continue;
    }

    recorder?.endSlot(slots);
    i += 1;
  }

  // Final pass: clear any trespass boundary that's now covered by a travel
  // slot's interior. The cascade can produce travels whose placement
  // subsumes a boundary that was trespass-marked earlier in the walk; the
  // marker is redundant once a visible travel covers that point.
  clearTrespassesCoveredByTravels(slots);
}

// ---------------------------------------------------------------------------
// Post-pass: clear trespass boundaries that have been overlapped by a travel
// slot. Trespass markers are geometric — the boundary point sits exposed
// without an explicit travel crossing it. If a later cascade placement
// produces a travel whose interior strictly contains the boundary point,
// the marker is no longer informative and is removed.
// ---------------------------------------------------------------------------

function clearTrespassesCoveredByTravels(slots: Slot[]): void {
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

// ---------------------------------------------------------------------------
// Current type: Available
// ---------------------------------------------------------------------------

function handleAvailable(
  slots: Slot[],
  i: number,
  travelManager: TravelManager,
  categories: Category[],
  recorder?: TravelPassRecorder,
): number {
  const slot = slots[i] as AvailableSlot;

  // Outer guard: prev != next (null on either side = no transition).
  // resolveTravel tracks the leg here; absorb branches untrack and retrack.
  const action = travelManager.resolveTravel(slot);
  if (!action) {
    recorder?.decision(M.handleAvailable.outerGuardSkip, 0);
    return i + 1;
  }
  recorder?.decision(
    M.handleAvailable.outerGuardTransition(action.travelMinutes),
    0,
  );

  // Current size: large enough for travel
  if (slot.durationMinutes >= action.travelMinutes) {
    recorder?.decision(
      M.handleAvailable.currentLargeEnough(
        slot.durationMinutes,
        action.travelMinutes,
      ),
      1,
    );
    const result = placeTravelInCurrent(slots, i, action);
    recorder?.action(
      M.handleAvailable.placeTravelInCurrentAction(!!action.placeAtSlotStart),
    );
    return result;
  }
  recorder?.decision(
    M.handleAvailable.currentTooSmall(
      slot.durationMinutes,
      action.travelMinutes,
    ),
    1,
  );

  // Current size: not large enough for travel
  const prev = i > 0 ? slots[i - 1] : null;
  const next = i + 1 < slots.length ? slots[i + 1] : null;

  // Forward walker invariant: a Travel slot at i+1 means the next transition
  // was already placed, so the current transition is stale. Untrack, log,
  // skip — same handling regardless of prev type.
  if (next?.type === "travel") {
    travelManager.untrackLeg(action.prevLocation, action.nextLocation);
    logInconsistency(
      `Available with Next=Travel (prev=${prev?.type ?? "none"}) — should not occur on forward walk`,
    );
    recorder?.decision(M.handleAvailable.nextIsTravelDecision, 2);
    recorder?.action(M.handleAvailable.skipInconsistent);
    return i + 1;
  }

  // ---- Prev type: Travel (slots[i-1] directly OR slots[i-2] via transparent prev Available) ----
  const prevTravel = findPrevTravelForAvailable(slots, i);
  if (prevTravel) {
    recorder?.decision(
      M.handleAvailable.prevIsTravel(
        prevTravel.travelIndex,
        recorder.label(prevTravel.travel),
      ),
      2,
    );
    if (
      next?.type === "occupied" ||
      next?.type === "available" ||
      next?.type === "category"
    ) {
      recorder?.decision(M.handleAvailable.nextAbsorbReplan(next.type), 3);
      const result = absorbAndReplan(
        slots,
        i,
        action,
        prevTravel,
        travelManager,
        recorder,
      );
      return result;
    }
  }

  // ---- Prev type: Available or Category ----
  // Category is treated as Available for prev-side handling — both are
  // "soft" predecessors that can bleed time backwards if current is too
  // small. The asymmetry on the next side (bleedIntoPrev vs
  // bleedAcrossPrevCurrentNext) only depends on next's type.
  if (prev?.type === "available" || prev?.type === "category") {
    recorder?.decision(M.handleAvailable.prevSoft(prev.type), 2);
    if (next?.type === "available" || next?.type === "category") {
      recorder?.decision(M.handleAvailable.nextBleedAcross(next.type), 3);
      const result = bleedAcrossPrevCurrentNext(slots, i, action);
      recorder?.action(M.handleAvailable.bleedAcrossAction);
      return result;
    }
    if (next?.type === "occupied") {
      recorder?.decision(M.handleAvailable.nextOccupiedBleedIntoPrev, 3);
      return bleedIntoPrev(
        slots,
        i,
        action,
        travelManager,
        categories,
        recorder,
      );
    }
  }

  // ---- Prev type: Occupied ----
  if (prev?.type === "occupied") {
    recorder?.decision(M.handleAvailable.prevOccupied, 2);
    if (next?.type === "available" || next?.type === "category") {
      recorder?.decision(M.handleAvailable.nextBleedIntoNext(next.type), 3);
      return bleedIntoNext(slots, i, action, travelManager, recorder);
    }
    if (next?.type === "occupied") {
      recorder?.decision(M.handleAvailable.nextOccupiedFillCurrent, 3);
      const result = fillCurrentWithAlert(slots, i, action);
      recorder?.action(M.handleAvailable.fillCurrentWithAlertAction);
      return result;
    }
  }

  travelManager.untrackLeg(action.prevLocation, action.nextLocation);
  logInconsistency("handleAvailable: unhandled prev/next combination");
  recorder?.decision(M.handleAvailable.unhandledCombination, 2);
  recorder?.action(M.handleAvailable.skipUnhandled);
  return i + 1;
}

// ---------------------------------------------------------------------------
// Current type: Category — Entry edge then Exit edge
// ---------------------------------------------------------------------------

function handleCategory(
  slots: Slot[],
  i: number,
  travelManager: TravelManager,
  categories: Category[],
  recorder?: TravelPassRecorder,
): number {
  recorder?.decision(M.handleCategory.entryEdge, 0);
  const afterEntry = handleCategoryEntryEdge(slots, i, travelManager, recorder);

  if (afterEntry >= slots.length || slots[afterEntry].type !== "category") {
    return afterEntry;
  }

  recorder?.decision(M.handleCategory.exitEdge, 0);
  return handleCategoryExitEdge(
    slots,
    afterEntry,
    travelManager,
    categories,
    recorder,
  );
}

function handleCategoryEntryEdge(
  slots: Slot[],
  i: number,
  travelManager: TravelManager,
  recorder?: TravelPassRecorder,
): number {
  const slot = slots[i] as CategorySlot;

  // Outer guard: prev != current (null on either side = no transition).
  // Manual check so we don't track a leg we won't end up placing.
  if (
    !slot.prevLocationId ||
    !slot.currentLocationId ||
    slot.prevLocationId === slot.currentLocationId
  ) {
    recorder?.decision(M.handleCategoryEntryEdge.outerGuardSkip, 1);
    return i;
  }

  // ---- no prev (i === 0) ----
  if (i === 0) {
    recorder?.decision(M.handleCategoryEntryEdge.noPrev, 1);
    return i;
  }

  const prev = slots[i - 1];

  // Decide whether to skip (transition already handled) or place a new
  // entry travel. We fall through to the placement block when the user
  // is at slot.prevLocationId (not current) and needs a fresh travel
  // from there to current.

  if (prev.type === "travel") {
    if (prev.travelToLocationId === slot.currentLocationId) {
      recorder?.decision(M.handleCategoryEntryEdge.prevTravelEndsAtCurrent, 1);
      return i;
    }
    if (prev.travelToLocationId !== slot.prevLocationId) {
      // The prev Travel landed somewhere we don't expect. Log and skip.
      logInconsistency(
        `Category entry edge: prev Travel destination ${prev.travelToLocationId} doesn't match slot.prevLocationId ${slot.prevLocationId}`,
      );
      recorder?.decision(M.handleCategoryEntryEdge.prevTravelUnexpectedDest, 1);
      return i;
    }
    recorder?.decision(M.handleCategoryEntryEdge.prevTravelMatchesPrevLoc, 1);
  } else if (prev.type === "available") {
    if (i >= 2) {
      const prevPrev = slots[i - 2];
      if (
        prevPrev.type === "travel" &&
        prevPrev.travelToLocationId === slot.currentLocationId
      ) {
        recorder?.decision(
          M.handleCategoryEntryEdge.prevAvailableWithTravelAtPrevPrev(i - 2),
          1,
        );
        return i;
      }
    }
    logInconsistency(
      "Category entry edge: prev Available without matching Travel at slots[i-2]",
    );
    recorder?.decision(
      M.handleCategoryEntryEdge.prevAvailableNoMatchingTravel,
      1,
    );
    return i;
  } else if (prev.type === "category") {
    recorder?.decision(M.handleCategoryEntryEdge.prevCategory, 1);
    return i;
  } else if (prev.type === "occupied") {
    if (prev.locationId == null) {
      let lookback = i - 2;
      while (
        lookback >= 0 &&
        slots[lookback].type === "occupied" &&
        (slots[lookback] as OccupiedSlot).locationId == null
      ) {
        lookback--;
      }
      if (lookback >= 0 && slots[lookback].type === "travel") {
        const earlierTravel = slots[lookback] as TravelSlot;
        if (earlierTravel.travelToLocationId === slot.currentLocationId) {
          recorder?.decision(
            M.handleCategoryEntryEdge.prevAnywhereOccupiedHandled(lookback),
            1,
          );
          return i;
        }
      }
    }
    recorder?.decision(M.handleCategoryEntryEdge.prevOccupiedFallThrough, 1);
  }

  // Place the entry travel.
  const action = travelManager.resolveCategoryEdge(slot, "entry");
  if (!action) {
    recorder?.decision(M.handleCategoryEntryEdge.noActionFromResolve, 1);
    return i;
  }

  if (slot.durationMinutes >= action.travelMinutes) {
    recorder?.decision(
      M.handleCategoryEntryEdge.fitsAtHead(
        slot.durationMinutes,
        action.travelMinutes,
      ),
      2,
    );
    const result = placeTravelAtCategoryHead(slots, i, action);
    recorder?.action(M.handleCategoryEntryEdge.placeAtHeadAction);
    return result;
  }
  recorder?.decision(
    M.handleCategoryEntryEdge.bypassCascade(
      slot.durationMinutes,
      action.travelMinutes,
    ),
    2,
  );
  return bypassCategoryCascade(slots, i, action, travelManager, recorder);
}

function handleCategoryExitEdge(
  slots: Slot[],
  i: number,
  travelManager: TravelManager,
  categories: Category[],
  recorder?: TravelPassRecorder,
): number {
  const slot = slots[i] as CategorySlot;

  // Outer guard
  if (
    !slot.currentLocationId ||
    !slot.nextLocationId ||
    slot.currentLocationId === slot.nextLocationId
  ) {
    recorder?.decision(M.handleCategoryExitEdge.outerGuardSkip, 1);
    return i + 1;
  }

  // ---- no next (last slot) ----
  if (i + 1 >= slots.length) {
    markCategoryFinal(slot);
    recorder?.decision(M.handleCategoryExitEdge.lastSlotFinal, 1);
    recorder?.action(M.handleCategoryExitEdge.markFinalAction);
    return i + 1;
  }

  const next = slots[i + 1];

  // ---- Next type: Available ----
  if (next.type === "available") {
    recorder?.decision(M.handleCategoryExitEdge.nextAvailableDeferred, 1);
    return i + 1;
  }

  // ---- Next type: Category ----
  if (next.type === "category") {
    recorder?.decision(M.handleCategoryExitEdge.nextCategoryBleedBoundary, 1);
    const action = travelManager.resolveCategoryEdge(slot, "exit");
    if (!action) {
      recorder?.decision(M.handleCategoryExitEdge.noActionFromResolve, 2);
      return i + 1;
    }
    return bleedAcrossCategoryBoundary(
      slots,
      i,
      action,
      travelManager,
      recorder,
    );
  }

  // ---- Next type: Occupied ----
  if (next.type === "occupied") {
    recorder?.decision(
      M.handleCategoryExitEdge.nextOccupied(recorder.label(next)),
      1,
    );
    const action = travelManager.resolveCategoryEdge(slot, "exit");
    if (!action) {
      recorder?.decision(M.handleCategoryExitEdge.noActionFromResolve, 2);
      return i + 1;
    }

    if (slot.durationMinutes >= action.travelMinutes) {
      recorder?.decision(
        M.handleCategoryExitEdge.fitsAtTail(
          slot.durationMinutes,
          action.travelMinutes,
        ),
        2,
      );
      const result = placeTravelAtCategoryTail(slots, i, action);
      recorder?.action(M.handleCategoryExitEdge.placeAtTailAction);
      return result;
    }

    // Same lookup as the Available handler — the walker reaches the Category
    // exit edge after processing the leading Available, so the prev Travel is
    // either directly behind or one slot back across a transparent leftover.
    const prevTravel = findPrevTravelForAvailable(slots, i);
    if (prevTravel) {
      recorder?.decision(
        M.handleCategoryExitEdge.prevTravelAbsorbReplan(
          prevTravel.travelIndex,
          recorder.label(prevTravel.travel),
        ),
        2,
      );
      return absorbAndReplanThroughCategory(
        slots,
        i,
        action,
        prevTravel,
        travelManager,
        categories,
        recorder,
      );
    }

    recorder?.decision(M.handleCategoryExitEdge.noPrevTravel, 2);
    return fillCategoryTailOrTrespass(
      slots,
      i,
      action,
      travelManager,
      recorder,
    );
  }

  // ---- Next type: Travel ----
  if (next.type === "travel") {
    travelManager.untrackLeg(slot.currentLocationId, slot.nextLocationId);
    logInconsistency(
      "Category exit edge: Next=Travel — should not occur on forward walk",
    );
    recorder?.decision(M.handleCategoryExitEdge.nextIsTravelDecision, 1);
    recorder?.action(M.handleCategoryExitEdge.skipInconsistent);
    return i + 1;
  }

  logInconsistency("Category exit edge: unhandled next type");
  recorder?.decision(M.handleCategoryExitEdge.unhandledNext, 1);
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

// ---------------------------------------------------------------------------
// Cascade anchor walk — shared by backwardBypassCascade() and
// absorbAndReplanThroughCategory(). Walks backward from startIdx looking for
// an anchor whose location yields a direct A→destination travel that fits
// in the absorbed region. Continues past any Travel anchor that doesn't fit
// (the old behaviour was to abort, but a Category further back could still
// yield a clean fit — taking it is strictly better than insufficient
// fallback).
//
// Anchor rules:
//   - location-pinned Occupied  → hard stop
//   - Anywhere Occupied         → pass through, keep walking
//   - Available                 → abort (caller falls back to insufficient
//                                 placement; we won't sacrifice upstream
//                                 free time for a forced routing)
//   - Travel                    → candidate: A = travel.from. Region starts
//                                 at travel.start. If fits, return fit;
//                                 else keep walking past it.
//   - Category                  → candidate: A = category.currentLocation.
//                                 Region starts at category.end (or wrapper
//                                 end). If fits, return fit; else skip.
// ---------------------------------------------------------------------------

type CascadeAnchorFit =
  | {
      kind: "travel";
      anchorIdx: number;
      anchor: TravelSlot;
      A: string;
      TDirect: number;
      regionStart: Date;
      regionMinutes: number;
    }
  | {
      kind: "category";
      anchorIdx: number;
      anchor: CategorySlot;
      anchorLocation: string;
      T: number;
      slotStart: Date;
      slotDuration: number;
      useWrapperEnd: boolean;
      wrapperEnd: Date | null;
    };

type CascadeAnchorResult =
  | CascadeAnchorFit
  | { kind: "abort"; reason: "available" | "hardStop" | "exhausted" };

function findCascadeAnchor(
  slots: Slot[],
  startIdx: number,
  regionEnd: Date,
  destination: string,
  travelManager: TravelManager,
  categories: Category[],
  recorder: TravelPassRecorder | undefined,
  decisionDepth: number,
): CascadeAnchorResult {
  let idx = startIdx;
  while (idx >= 0) {
    const anchor = slots[idx];

    if (anchor.type === "occupied") {
      if (anchor.locationId != null) {
        if (recorder) {
          recorder.decision(
            M.cascadeWalk.anchorHardStopOccupied(idx, recorder.label(anchor)),
            decisionDepth,
          );
        }
        return { kind: "abort", reason: "hardStop" };
      }
      if (recorder) {
        recorder.decision(
          M.cascadeWalk.anchorAnywherePassThrough(idx, recorder.label(anchor)),
          decisionDepth,
        );
      }
      idx--;
      continue;
    }

    if (anchor.type === "available") {
      if (recorder) {
        recorder.decision(
          M.cascadeWalk.anchorAbortAvailable(idx, recorder.label(anchor)),
          decisionDepth,
        );
      }
      return { kind: "abort", reason: "available" };
    }

    if (anchor.type === "travel") {
      if (recorder) {
        recorder.decision(
          M.cascadeWalk.anchorTryAbsorbTravel(idx, recorder.label(anchor)),
          decisionDepth,
        );
      }
      const A = anchor.travelFromLocationId;
      if (A && A !== destination) {
        const TDirect = travelManager.getTravelTime(A, destination, regionEnd);
        if (TDirect > 0) {
          const regionStart = anchor.start;
          const regionMinutes = Math.floor(
            (regionEnd.getTime() - regionStart.getTime()) / 60000,
          );
          if (regionMinutes >= TDirect) {
            recorder?.decision(
              M.cascadeWalk.directFits(TDirect, regionMinutes),
              decisionDepth + 1,
            );
            return {
              kind: "travel",
              anchorIdx: idx,
              anchor,
              A,
              TDirect,
              regionStart,
              regionMinutes,
            };
          }
          recorder?.decision(
            M.cascadeWalk.directDoesNotFit(TDirect, regionMinutes),
            decisionDepth + 1,
          );
        }
      }
      // Doesn't fit through this Travel; walk past it.
      idx--;
      continue;
    }

    if (anchor.type === "category") {
      const anchorLocation = anchor.currentLocationId;
      if (!anchorLocation || anchorLocation === destination) {
        if (recorder) {
          recorder.decision(
            M.cascadeWalk.anchorCategoryMatches(idx, recorder.label(anchor)),
            decisionDepth,
          );
        }
        idx--;
        continue;
      }

      const T = travelManager.getTravelTime(
        anchorLocation,
        destination,
        regionEnd,
      );
      if (T <= 0) {
        if (recorder) {
          recorder.decision(
            M.cascadeWalk.anchorCategoryNoTravel(idx, recorder.label(anchor)),
            decisionDepth,
          );
        }
        idx--;
        continue;
      }

      const wrapperEnd = findCategoryWrapperEnd(anchor, categories);
      const useWrapperEnd =
        wrapperEnd !== null && wrapperEnd.getTime() > anchor.end.getTime();
      const slotStart = useWrapperEnd ? wrapperEnd! : anchor.end;
      const slotDuration = Math.floor(
        (regionEnd.getTime() - slotStart.getTime()) / 60000,
      );

      if (slotDuration >= T) {
        if (recorder) {
          recorder.decision(
            M.cascadeWalk.anchorCategoryFits(
              idx,
              recorder.label(anchor),
              T,
              slotDuration,
            ),
            decisionDepth,
          );
        }
        return {
          kind: "category",
          anchorIdx: idx,
          anchor,
          anchorLocation,
          T,
          slotStart,
          slotDuration,
          useWrapperEnd,
          wrapperEnd,
        };
      }

      if (recorder) {
        recorder.decision(
          M.cascadeWalk.anchorCategoryDoesNotFit(
            idx,
            recorder.label(anchor),
            T,
            slotDuration,
          ),
          decisionDepth,
        );
      }
    }

    idx--;
  }

  return { kind: "abort", reason: "exhausted" };
}

// Locate the prev Travel slot for the absorb-and-replan cascade. Handles
// both placeAtSlotStart variants — the Travel may be at slots[i-1] directly,
// or at slots[i-2] across a transparent prev Available leftover.
function findPrevTravelForAvailable(
  slots: Slot[],
  i: number,
): PrevTravelMatch | null {
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

// ---------------------------------------------------------------------------
// Action: Available, current large enough — PlaceAtStart / PlaceAtEnd
// ---------------------------------------------------------------------------

function placeTravelInCurrent(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
): number {
  const slot = slots[i] as AvailableSlot;
  const { prevLocation, nextLocation, placeAtSlotStart, travelMinutes } =
    action;

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
        makeAvailableLeftover(
          travelEnd,
          slot.end,
          nextLocation,
          slot.nextLocationId ?? null,
        ),
      );
    }
  } else {
    if (slot.start.getTime() < travelStart.getTime()) {
      replacements.push(
        makeAvailableLeftover(
          slot.start,
          travelStart,
          slot.prevLocationId ?? null,
          prevLocation,
        ),
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
      durationMinutes: Math.floor(
        (slot.end.getTime() - travelEnd.getTime()) / 60000,
      ),
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
      durationMinutes: Math.floor(
        (travelStart.getTime() - slot.start.getTime()) / 60000,
      ),
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
  travelManager: TravelManager,
  categories: Category[],
  recorder?: TravelPassRecorder,
): number {
  const slot = slots[i] as AvailableSlot;
  const { prevLocation, nextLocation, travelMinutes } = action;
  const curDur = slot.durationMinutes;
  const prevIdx = i - 1;
  const prev = slots[prevIdx];

  const isPrevPlaceable =
    prev && (prev.type === "available" || prev.type === "category");

  if (!isPrevPlaceable) {
    recorder?.decision(M.bleedIntoPrev.prevNotPlaceable, 4);
    const result = fillCurrentWithAlert(slots, i, action);
    recorder?.action(M.bleedIntoPrev.fillCurrentWithAlertAction);
    return result;
  }

  const prevDur = prev.durationMinutes;
  const overflow = travelMinutes - curDur;

  // If a simple bleed would be insufficient, cascade backward through
  // previous placeable slots instead of immediately marking alert.
  if (overflow > prevDur) {
    recorder?.decision(
      M.bleedIntoPrev.overflowExceedsPrev(overflow, prevDur),
      4,
    );
    return backwardBypassCascade(
      slots,
      i,
      action,
      travelManager,
      categories,
      recorder,
    );
  }

  // Geometry: travel ends at slot.end (no legTracker rerouting here — bleed
  // just consumes time, doesn't pick a new route).
  const consumeFromPrev = overflow;
  const travelEnd = slot.end;
  const travelStart = new Date(slot.start.getTime() - consumeFromPrev * 60000);

  const travel = createTravelSlot(
    travelStart,
    travelEnd,
    prevLocation,
    nextLocation,
    "preliminary",
    uuidv4(),
    {
      insufficientTravel: false,
      requiredTravelMinutes: 0,
    },
  );

  const prevConsumed = consumeFromPrev >= prevDur;
  recorder?.action(
    prevConsumed
      ? M.bleedIntoPrev.actionConsumed(recorder.label(prev))
      : M.bleedIntoPrev.actionShortened(recorder.label(prev), consumeFromPrev),
  );
  return spliceBleedPrev(
    slots,
    i,
    prevIdx,
    prev,
    travel,
    prevConsumed,
    travelStart,
  );
}

function bleedIntoNext(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  travelManager: TravelManager,
  recorder?: TravelPassRecorder,
): number {
  const slot = slots[i] as AvailableSlot;
  const { prevLocation, nextLocation, travelMinutes } = action;
  const curDur = slot.durationMinutes;
  const nextIdx = i + 1;
  const next = slots[nextIdx];

  const isNextPlaceable =
    next && (next.type === "available" || next.type === "category");

  if (!isNextPlaceable) {
    recorder?.decision(M.bleedIntoNext.nextNotPlaceable, 4);
    const result = fillCurrentWithAlert(slots, i, action);
    recorder?.action(M.bleedIntoNext.fillCurrentWithAlertAction);
    return result;
  }

  const nextDur = next.durationMinutes;
  const overflow = travelMinutes - curDur;

  // If a simple bleed would be insufficient, cascade forward through
  // subsequent placeable slots instead of immediately marking alert.
  if (overflow > nextDur) {
    recorder?.decision(
      M.bleedIntoNext.overflowExceedsNext(overflow, nextDur),
      4,
    );
    return forwardBypassCascade(slots, i, action, travelManager, recorder);
  }

  // Geometry: travel starts at slot.start (no legTracker rerouting here —
  // bleed just consumes time, doesn't pick a new route).
  const consumeFromNext = overflow;
  const travelStart = slot.start;
  const travelEnd = new Date(slot.end.getTime() + consumeFromNext * 60000);

  const travel = createTravelSlot(
    travelStart,
    travelEnd,
    prevLocation,
    nextLocation,
    "preliminary",
    uuidv4(),
    {
      insufficientTravel: false,
      requiredTravelMinutes: 0,
    },
  );

  const nextConsumed = consumeFromNext >= nextDur;
  recorder?.action(
    nextConsumed
      ? M.bleedIntoNext.actionConsumed(recorder.label(next))
      : M.bleedIntoNext.actionShortened(recorder.label(next), consumeFromNext),
  );
  return spliceBleedNext(
    slots,
    i,
    nextIdx,
    next,
    travel,
    nextConsumed,
    travelEnd,
  );
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

  if (
    !prevConsumed &&
    (prev.type === "available" || prev.type === "category")
  ) {
    replacements.push(
      shortenPlaceableAtEnd(prev, travelStart, travel.travelFromLocationId),
    );
  } else if (prevConsumed && prev.type === "category") {
    travel.consumedCategoryIds = (travel.consumedCategoryIds ?? []).concat(
      prev.categoryId,
    );
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

  if (
    !nextConsumed &&
    (next.type === "available" || next.type === "category")
  ) {
    replacements.push(
      shortenPlaceableAtStart(next, travelEnd, travel.travelToLocationId),
    );
  } else if (nextConsumed && next.type === "category") {
    travel.consumedCategoryIds = (travel.consumedCategoryIds ?? []).concat(
      next.categoryId,
    );
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
  if (
    !prevConsumed &&
    (prev.type === "available" || prev.type === "category")
  ) {
    replacements.push(
      shortenPlaceableAtEnd(prev, travelStart, travel.travelFromLocationId),
    );
  } else if (prevConsumed && prev.type === "category") {
    travel.consumedCategoryIds = (travel.consumedCategoryIds ?? []).concat(
      prev.categoryId,
    );
  }

  replacements.push(travel);

  const nextConsumed = bleedNext >= nextDur;
  if (
    !nextConsumed &&
    (next.type === "available" || next.type === "category")
  ) {
    replacements.push(
      shortenPlaceableAtStart(next, travelEnd, travel.travelToLocationId),
    );
  } else if (nextConsumed && next.type === "category") {
    travel.consumedCategoryIds = (travel.consumedCategoryIds ?? []).concat(
      next.categoryId,
    );
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
  recorder?: TravelPassRecorder,
): number {
  const slot = slots[i] as CategorySlot;
  const T = action.travelMinutes;
  const curDur = slot.durationMinutes;

  if (T >= curDur) {
    // Entire interior consumed -> trespass instead of visible travel.
    slot.trespassingEnd = true;
    travelManager.untrackLeg(action.prevLocation, action.nextLocation);
    recorder?.decision(M.fillCategoryTailOrTrespass.trespassEnd(T, curDur), 3);
    recorder?.action(
      M.fillCategoryTailOrTrespass.trespassEndAction(recorder.label(slot)),
    );
    return i + 1;
  }

  // Otherwise fill the category TAIL with an alert travel.
  const travelEnd = slot.end;
  const travelStart = new Date(travelEnd.getTime() - curDur * 60000);
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

  const replacements: Slot[] = [];
  if (slot.start.getTime() < travelStart.getTime()) {
    replacements.push({
      ...slot,
      end: travelStart,
      durationMinutes: Math.floor(
        (travelStart.getTime() - slot.start.getTime()) / 60000,
      ),
      nextLocationId: slot.currentLocationId,
      trespassingEnd: undefined,
      isFinal: undefined,
    });
  }
  replacements.push(travel);

  slots.splice(i, 1, ...replacements);
  recorder?.action(M.fillCategoryTailOrTrespass.fillTailAction(curDur, T));
  return i + replacements.length;
}

// ---------------------------------------------------------------------------
// Action: Available with Prev=Travel — absorb prev Travel + leftover Available
// into one A->C region and re-place a fresh travel at the region's tail. Used
// for both next=Available/Category and next=Occupied — the splice geometry
// only touches [prevAvailable?, prevTravel, ..., current], so next is left
// for the walker's next iteration regardless of its type.
// ---------------------------------------------------------------------------

function absorbAndReplan(
  slots: Slot[],
  i: number,
  originalAction: TravelProcessingAction,
  prevTravel: PrevTravelMatch,
  travelManager: TravelManager,
  recorder?: TravelPassRecorder,
): number {
  // Undo the resolveTravel-tracked leg and the prev Travel's leg.
  travelManager.untrackLeg(
    originalAction.prevLocation,
    originalAction.nextLocation,
  );
  const oldFrom = prevTravel.travel.travelFromLocationId;
  const oldTo = prevTravel.travel.travelToLocationId;
  if (oldFrom && oldTo) travelManager.untrackLeg(oldFrom, oldTo);

  // Plan A -> C, where A = prev Travel's origin, C = current.nextLocation.
  const A = prevTravel.travel.travelFromLocationId;
  const C = originalAction.nextLocation;
  if (!A) {
    recorder?.decision(M.absorbAndReplan.missingOrigin, 4);
    const result = fillCurrentWithAlert(slots, i, originalAction);
    recorder?.action(M.absorbAndReplan.fillCurrentWithAlertAction);
    return result;
  }

  const slot = slots[i] as AvailableSlot;
  const newDuration = travelManager.getTravelTime(A, C, slot.end);
  if (newDuration <= 0) {
    recorder?.decision(M.absorbAndReplan.noTravelTime, 4);
    const result = fillCurrentWithAlert(slots, i, originalAction);
    recorder?.action(M.absorbAndReplan.fillCurrentWithAlertAction);
    return result;
  }
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
  const travelStartMs = Math.max(
    regionStartMs,
    regionEndMs - newDuration * 60000,
  );
  const insufficient = regionEndMs - regionStartMs < newDuration * 60000;
  const travelStart = new Date(travelStartMs);
  const travelEnd = regionEnd;

  // Geometric overconstrained: slot is always <= newDuration here, so the
  // flag stays off. See absorbAndReplanThroughCategory for full rationale.
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
  const absorbed = slots.slice(firstIdx, firstIdx + removeCount);
  slots.splice(firstIdx, removeCount, ...replacements);
  if (recorder) {
    recorder.action(
      M.absorbAndReplan.action(
        absorbed.map((s) => recorder.label(s)),
        insufficient,
      ),
    );
  }
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
  categories: Category[],
  recorder?: TravelPassRecorder,
): number {
  // Undo the resolveCategoryEdge-tracked leg (B -> C) and the prev Travel's
  // leg (A -> B). The new placement (either via cascade walk or 2-slot
  // fallback) re-tracks whichever leg it ends up placing.
  travelManager.untrackLeg(
    originalAction.prevLocation,
    originalAction.nextLocation,
  );
  const oldFrom = prevTravel.travel.travelFromLocationId;
  const oldTo = prevTravel.travel.travelToLocationId;
  if (oldFrom && oldTo) travelManager.untrackLeg(oldFrom, oldTo);

  const category = slots[i] as CategorySlot;
  const A = prevTravel.travel.travelFromLocationId;
  const C = originalAction.nextLocation;
  if (!A) {
    recorder?.decision(M.absorbAndReplanThroughCategory.missingOrigin, 3);
    return fillCategoryTailOrTrespass(
      slots,
      i,
      originalAction,
      travelManager,
      recorder,
    );
  }

  const newDuration = travelManager.getTravelTime(A, C, category.end);
  if (newDuration <= 0) {
    recorder?.decision(M.absorbAndReplanThroughCategory.noTravelTime, 3);
    return fillCategoryTailOrTrespass(
      slots,
      i,
      originalAction,
      travelManager,
      recorder,
    );
  }

  // First: check whether the simple 2-slot absorb (prevTravel + current
  // category, plus an optional leftover Available) gives a region big enough
  // for the direct A→C travel. If so, take it — same behaviour as the
  // original implementation.
  const prevAvailable =
    prevTravel.availableIndex !== null
      ? (slots[prevTravel.availableIndex] as AvailableSlot)
      : null;
  const baseRegionStart = prevAvailable?.start ?? prevTravel.travel.start;
  const baseRegionMinutes = Math.floor(
    (category.end.getTime() - baseRegionStart.getTime()) / 60000,
  );
  const baseFits = baseRegionMinutes >= newDuration;

  if (!baseFits) {
    // The 2-slot absorb would be insufficient. Walk further back looking
    // for a deeper anchor whose direct A'→C fits the larger region.
    recorder?.decision(M.absorbAndReplanThroughCategoryCascade.header, 3);
    const fit = findCascadeAnchor(
      slots,
      prevTravel.travelIndex - 1,
      category.end,
      C,
      travelManager,
      categories,
      recorder,
      4,
    );

    if (fit.kind === "travel") {
      return applyTravelAnchorAbsorb(
        slots,
        i,
        fit,
        C,
        category.end,
        travelManager,
        recorder,
        (labels) =>
          M.absorbAndReplanThroughCategoryCascade.travelAbsorbAction(labels),
      );
    }
    if (fit.kind === "category") {
      return applyCategoryAnchorPlacement(
        slots,
        i,
        fit,
        category.start,
        category.end,
        C,
        null,
        travelManager,
        recorder,
        (labels, overconstrained) =>
          M.absorbAndReplanThroughCategoryCascade.categoryAnchorAction(
            labels,
            overconstrained,
          ),
      );
    }
    // fit.kind === "abort" — no deeper anchor fits. Fall through to the
    // original 2-slot insufficient placement.
    recorder?.decision(M.absorbAndReplanThroughCategoryCascade.noAnchorFits, 4);
  }

  // Base 2-slot absorb: either fits naturally, or no deeper anchor was found
  // and we accept the insufficient placement.
  travelManager.trackLeg(A, C);

  const regionEnd = category.end;
  const regionStartMs = baseRegionStart.getTime();
  const regionEndMs = regionEnd.getTime();

  const travelStartMs = Math.max(
    regionStartMs,
    regionEndMs - newDuration * 60000,
  );
  const insufficient = !baseFits;
  const travelStart = new Date(travelStartMs);
  const travelEnd = regionEnd;

  // Geometric overconstrained: only flag when the travel slot is BIGGER than
  // the actual travel duration (wasted space). This function's geometry
  // never produces that — the slot is min(regionSize, newDuration) — so the
  // flag stays off. Skipping the bypassed category is a natural consequence
  // of the original walker placement being unworkable, not a forced bad
  // routing the user needs to see flagged.
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
  travel.consumedCategoryIds = [category.categoryId];

  const replacements: Slot[] = [];
  if (regionStartMs < travelStartMs) {
    replacements.push({
      type: "available",
      start: baseRegionStart,
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
  const absorbed = slots.slice(firstIdx, firstIdx + removeCount);
  slots.splice(firstIdx, removeCount, ...replacements);
  if (recorder) {
    recorder.action(
      M.absorbAndReplanThroughCategory.action(
        absorbed.map((s) => recorder.label(s)),
        insufficient,
      ),
    );
  }
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
  recorder?: TravelPassRecorder,
): number {
  // The walker tried to enter Cat[i] with a travel from prev (Occupied) that
  // doesn't fit in the cat HEAD. Bypass: route to the first pinned location
  // AFTER the cat and walk forward. Replan iteratively at each Category we
  // walk into — when crossing a location boundary, retarget the travel to
  // that location and recheck fit. The cascade exits when the (possibly
  // replanned) travel duration fits in the accumulated span: either entirely
  // within consumed slots (end at slot.start, overconstrained), or with a
  // partial split inside the current slot (bleed in). Hard stop or end of
  // slots → insufficient.
  travelManager.untrackLeg(action.prevLocation, action.nextLocation);
  recorder?.decision(M.bypassCategoryCascade.header, 3);

  const category = slots[i] as CategorySlot;
  const A = action.prevLocation;

  let destination = nextPinnedLocation(slots, i + 1);
  if (!destination) {
    recorder?.decision(M.bypassCategoryCascade.noPinnedDestination, 4);
    return fillCategoryTailOrTrespass(
      slots,
      i,
      action,
      travelManager,
      recorder,
    );
  }
  let T = travelManager.getTravelTime(A, destination, category.end);
  if (T <= 0) {
    recorder?.decision(M.bypassCategoryCascade.noTravelTime, 4);
    return fillCategoryTailOrTrespass(
      slots,
      i,
      action,
      travelManager,
      recorder,
    );
  }
  travelManager.trackLeg(A, destination);
  recorder?.decision(M.bypassCategoryCascade.initialDestination(T), 4);

  let consumed = 0;
  let consumeIdx = i;
  const consumedCategoryIds: string[] = [];
  let partialSplitTime: Date | null = null;
  let hardStop = false;
  let endAtSlotStart = false;
  let endSlotIdx = -1;

  while (consumeIdx < slots.length) {
    const slot = slots[consumeIdx];

    if (slot.type === "occupied" || slot.type === "travel") {
      if (recorder) {
        recorder.decision(
          M.bypassCategoryCascade.anchorHardStop(
            consumeIdx,
            recorder.label(slot),
          ),
          4,
        );
      }
      if (
        consumeIdx > i &&
        slot.type === "occupied" &&
        slot.locationId &&
        slot.locationId !== destination
      ) {
        const newT = travelManager.getTravelTime(
          A,
          slot.locationId,
          category.end,
        );
        if (newT > 0) {
          travelManager.untrackLeg(A, destination);
          travelManager.trackLeg(A, slot.locationId);
          destination = slot.locationId;
          T = newT;
          recorder?.decision(
            M.bypassCategoryCascade.retargetOccupied(newT),
            5,
          );
        }
      }
      hardStop = true;
      break;
    }

    // Abort the cascade if we'd cross an Available slot. The Available has
    // its own natural transition (gs→home in the user's scenario) that the
    // walker handles normally — stretching a forced bypass travel through
    // free time just to "land" at a pinned location wastes the Available's
    // capacity. Instead, trespass the boundaries of the consumed cats and
    // let the trailing Available place its own travel.
    if (consumeIdx > i && slot.type === "available") {
      if (recorder) {
        recorder.decision(
          M.bypassCategoryCascade.anchorAbortAvailable(
            consumeIdx,
            recorder.label(slot),
          ),
          4,
        );
      }
      travelManager.untrackLeg(A, destination);
      const trespassed: string[] = [];
      for (let k = i; k < consumeIdx; k++) {
        const s = slots[k];
        if (s.type !== "category") continue;
        s.trespassingStart = true;
        // Trespass-end applies to intermediate cats: the user "leaves"
        // each cat without proper travel to enter the next. The last
        // consumed cat transitions naturally into the Avail (whose prev
        // matches the cat's location) so its end stays clean.
        if (k < consumeIdx - 1) s.trespassingEnd = true;
        trespassed.push(recorder?.label(s) ?? s.categoryId);
      }
      recorder?.action(M.bypassCategoryCascade.trespassedAction(trespassed));
      return i;
    }

    // Only break/bleed at Category slots — Avails are transit space, not
    // destinations the user wants to land in. At an Avail we always
    // consume and continue cascading. At a Cat past the bypassed one,
    // replan to its location if it differs from the running destination,
    // then check fit.
    if (consumeIdx > i && slot.type === "category") {
      const slotLoc = slot.currentLocationId;
      if (slotLoc && slotLoc !== destination) {
        const newT = travelManager.getTravelTime(A, slotLoc, category.end);
        if (newT > 0) {
          travelManager.untrackLeg(A, destination);
          travelManager.trackLeg(A, slotLoc);
          destination = slotLoc;
          T = newT;
          if (recorder) {
            recorder.decision(
              M.bypassCategoryCascade.anchorRetarget(
                consumeIdx,
                recorder.label(slot),
                newT,
              ),
              4,
            );
          }
        }
      }

      if (T <= consumed) {
        recorder?.decision(
          M.bypassCategoryCascade.endAtSlotStart(T, consumed, consumeIdx),
          5,
        );
        endAtSlotStart = true;
        endSlotIdx = consumeIdx;
        break;
      }

      const slotDur = slot.durationMinutes;
      if (consumed + slotDur >= T) {
        const remaining = T - consumed;
        partialSplitTime = new Date(slot.start.getTime() + remaining * 60000);
        if (remaining > 0) consumedCategoryIds.push(slot.categoryId);
        consumed = T;
        recorder?.decision(
          M.bypassCategoryCascade.partialSplit(consumeIdx, remaining),
          5,
        );
        break;
      }
      if (recorder) {
        recorder.decision(
          M.bypassCategoryCascade.anchorConsume(
            consumeIdx,
            recorder.label(slot),
            slotDur,
          ),
          4,
        );
      }
    }

    if (slot.type === "category") consumedCategoryIds.push(slot.categoryId);
    consumed += slot.durationMinutes;
    consumeIdx += 1;
  }

  let travelEnd: Date;
  let insufficient = false;

  if (endAtSlotStart) {
    travelEnd = slots[endSlotIdx].start;
    insufficient = consumed < T;
  } else if (partialSplitTime) {
    travelEnd = partialSplitTime;
  } else if (hardStop) {
    travelEnd = slots[consumeIdx].start;
    insufficient = consumed < T;
  } else if (consumed < T) {
    travelEnd = consumeIdx > i ? slots[consumeIdx - 1].end : category.end;
    insufficient = true;
  } else {
    travelEnd = consumeIdx > i ? slots[consumeIdx - 1].end : category.end;
  }

  // Geometric overconstrained: only when the travel slot is bigger than the
  // actual travel duration. Exact-fit bleed stays clean; insufficient never
  // sets this flag.
  const travelSlotMinutes = Math.floor(
    (travelEnd.getTime() - category.start.getTime()) / 60000,
  );
  const overconstrained = !insufficient && travelSlotMinutes > T;

  const travel = createTravelSlot(
    category.start,
    travelEnd,
    A,
    destination,
    "preliminary",
    uuidv4(),
    {
      insufficientTravel: insufficient,
      requiredTravelMinutes: insufficient ? T : 0,
      overconstrained,
    },
  );
  travel.consumedCategoryIds = consumedCategoryIds;

  const replacements: Slot[] = [travel];
  let removeCount: number;
  if (endAtSlotStart) {
    removeCount = endSlotIdx - i;
  } else if (partialSplitTime && consumeIdx < slots.length) {
    const partial = slots[consumeIdx];
    if (partial.type === "available" || partial.type === "category") {
      replacements.push(
        shortenPlaceableAtStart(partial, partialSplitTime, destination),
      );
      removeCount = consumeIdx - i + 1;
    } else {
      removeCount = consumeIdx - i;
    }
  } else {
    removeCount = consumeIdx - i;
  }

  const absorbed = slots.slice(i, i + removeCount);
  slots.splice(i, removeCount, ...replacements);
  if (recorder) {
    recorder.action(
      M.bypassCategoryCascade.action(
        absorbed.map((s) => recorder.label(s)),
        insufficient,
        overconstrained,
      ),
    );
  }
  // Return i + 1 so the walker lands on slots[i+1] — either the preserved
  // slot (endAtSlotStart / hard stop) or the shortened cat after bleed. In
  // the bleed case, the shortened cat's exit edge needs to fire so a
  // follow-up transition travel from the cat's location can be placed.
  return i + 1;
}

// Find the first slot at or after startIdx that has a meaningful destination
// location. Available slots return their nextLocationId (the location the
// user is heading toward, not the location they're coming from — that would
// be the just-bypassed cat). Category and Occupied slots return their own
// location. Stops at the first hard-stop boundary.
function nextPinnedLocation(slots: Slot[], startIdx: number): string | null {
  for (let k = startIdx; k < slots.length; k++) {
    const s = slots[k];
    if (s.type === "category") return s.currentLocationId;
    if (s.type === "occupied") {
      if (s.locationId) return s.locationId;
      continue;
    }
    if (s.type === "available") {
      if (s.nextLocationId) return s.nextLocationId;
      continue;
    }
    if (s.type === "travel") return s.travelToLocationId;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Action: Available with next=Occupied — backward bypass cascade.
// Mirror of bypassCategoryCascade. Walks backward looking for an earlier
// Category whose location lets the travel fit in the accumulated span.
// First-fit wins. Absorbed travels in between get untracked; absorbed
// categories go into consumedCategoryIds. If the slot ends up bigger than
// the actual travel duration, marks overconstrained.
// ---------------------------------------------------------------------------

function backwardBypassCascade(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  travelManager: TravelManager,
  categories: Category[],
  recorder?: TravelPassRecorder,
): number {
  const current = slots[i] as AvailableSlot;
  const destination = action.nextLocation;
  const slotEnd = current.end;

  // Untrack the original leg up front. If no anchor fits, cascadeFallbackPrev()
  // re-tracks it before falling back.
  travelManager.untrackLeg(action.prevLocation, action.nextLocation);
  recorder?.decision(M.backwardBypassCascade.header, 5);

  const fit = findCascadeAnchor(
    slots,
    i - 1,
    slotEnd,
    destination,
    travelManager,
    categories,
    recorder,
    6,
  );

  if (fit.kind === "abort") {
    recorder?.decision(M.backwardBypassCascade.noAnchorFits, 6);
    const result = cascadeFallbackPrev(slots, i, action, travelManager);
    recorder?.action(M.backwardBypassCascade.fallbackPrevAction);
    return result;
  }

  if (fit.kind === "travel") {
    return applyTravelAnchorAbsorb(
      slots,
      i,
      fit,
      destination,
      slotEnd,
      travelManager,
      recorder,
      (labels) => M.backwardBypassCascade.travelAbsorbAction(labels),
    );
  }

  // fit.kind === "category"
  return applyCategoryAnchorPlacement(
    slots,
    i,
    fit,
    current.start,
    slotEnd,
    destination,
    current.nextLocationId ?? null,
    travelManager,
    recorder,
    (labels, overconstrained) =>
      M.backwardBypassCascade.action(labels, overconstrained),
  );
}

// ---------------------------------------------------------------------------
// Cascade placement helpers — shared by backwardBypassCascade() and
// absorbAndReplanThroughCategory(). Splice the slot array given a fit, mark
// the new travel, and emit an action line via the caller's message builder.
// ---------------------------------------------------------------------------

function applyTravelAnchorAbsorb(
  slots: Slot[],
  i: number,
  fit: Extract<CascadeAnchorFit, { kind: "travel" }>,
  destination: string,
  regionEnd: Date,
  travelManager: TravelManager,
  recorder: TravelPassRecorder | undefined,
  actionMessage: (absorbedLabels: string[]) => string,
): number {
  const { anchorIdx, anchor, A, TDirect, regionStart } = fit;

  // Untrack the absorbed travel's leg, track the new direct leg.
  if (anchor.travelFromLocationId && anchor.travelToLocationId) {
    travelManager.untrackLeg(
      anchor.travelFromLocationId,
      anchor.travelToLocationId,
    );
  }
  // Untrack any other travel legs we're absorbing between anchor and i.
  for (let k = anchorIdx + 1; k <= i; k++) {
    const s = slots[k];
    if (s.type === "travel" && s.travelFromLocationId && s.travelToLocationId) {
      travelManager.untrackLeg(s.travelFromLocationId, s.travelToLocationId);
    }
  }
  travelManager.trackLeg(A, destination);

  const consumedCategoryIds: string[] = [];
  for (let k = anchorIdx + 1; k <= i; k++) {
    const s = slots[k];
    if (s.type === "category") consumedCategoryIds.push(s.categoryId);
  }

  const travelStart = new Date(regionEnd.getTime() - TDirect * 60000);
  const travel = createTravelSlot(
    travelStart,
    regionEnd,
    A,
    destination,
    "preliminary",
    uuidv4(),
  );
  travel.consumedCategoryIds = consumedCategoryIds;

  const replacements: Slot[] = [];
  if (regionStart.getTime() < travelStart.getTime()) {
    // Leftover free time at A before the merged travel. prev/next both point
    // to A so the walker doesn't try to place another travel here.
    replacements.push({
      type: "available",
      start: regionStart,
      end: travelStart,
      durationMinutes: Math.floor(
        (travelStart.getTime() - regionStart.getTime()) / 60000,
      ),
      prevLocationId: A,
      nextLocationId: A,
    });
  }
  replacements.push(travel);

  const removeCount = i - anchorIdx + 1;
  const absorbed = slots.slice(anchorIdx, anchorIdx + removeCount);
  slots.splice(anchorIdx, removeCount, ...replacements);
  if (recorder) {
    recorder.action(actionMessage(absorbed.map((s) => recorder.label(s))));
  }
  return anchorIdx + replacements.length;
}

function applyCategoryAnchorPlacement(
  slots: Slot[],
  i: number,
  fit: Extract<CascadeAnchorFit, { kind: "category" }>,
  currentStart: Date,
  regionEnd: Date,
  destination: string,
  tailNextLocation: string | null,
  travelManager: TravelManager,
  recorder: TravelPassRecorder | undefined,
  actionMessage: (absorbedLabels: string[], overconstrained: boolean) => string,
): number {
  const {
    anchorIdx,
    anchor,
    anchorLocation,
    T,
    slotStart,
    slotDuration,
    useWrapperEnd,
    wrapperEnd,
  } = fit;

  const consumedCategoryIds: string[] = [];
  for (let k = anchorIdx + 1; k <= i; k++) {
    const s = slots[k];
    if (s.type === "travel") {
      if (s.travelFromLocationId && s.travelToLocationId) {
        travelManager.untrackLeg(
          s.travelFromLocationId,
          s.travelToLocationId,
        );
      }
    } else if (s.type === "category") {
      consumedCategoryIds.push(s.categoryId);
    }
  }
  travelManager.trackLeg(anchorLocation, destination);

  // Extend anchor's end to its wrapper end so the new travel starts at a
  // clean boundary. The previously-eaten region is gone after the splice.
  if (useWrapperEnd && wrapperEnd) {
    anchor.end = wrapperEnd;
    anchor.durationMinutes = Math.floor(
      (wrapperEnd.getTime() - anchor.start.getTime()) / 60000,
    );
  }

  // Shrink the travel slot to its natural duration when the span exceeds it.
  // Only shrink when the natural-sized travel lands at or after currentStart,
  // so the leftover is cleanly a tail inside the current slot.
  const overconstrained = slotDuration > T;
  const proposedEnd = overconstrained
    ? new Date(slotStart.getTime() + T * 60000)
    : regionEnd;
  const canShrink =
    overconstrained && proposedEnd.getTime() >= currentStart.getTime();
  const actualTravelEnd = canShrink ? proposedEnd : regionEnd;

  const travel = createTravelSlot(
    slotStart,
    actualTravelEnd,
    anchorLocation,
    destination,
    "preliminary",
    uuidv4(),
    { overconstrained, requiredTravelMinutes: T },
  );
  travel.consumedCategoryIds = consumedCategoryIds;

  const replacements: Slot[] = [travel];
  if (canShrink && actualTravelEnd.getTime() < regionEnd.getTime()) {
    // Preserve the tail as free time at the destination. The user has landed
    // and waits for whatever's next.
    replacements.push({
      type: "available",
      start: actualTravelEnd,
      end: regionEnd,
      durationMinutes: Math.floor(
        (regionEnd.getTime() - actualTravelEnd.getTime()) / 60000,
      ),
      prevLocationId: destination,
      nextLocationId: tailNextLocation,
    });
  }

  const removeCount = i - anchorIdx;
  const absorbed = slots.slice(anchorIdx + 1, anchorIdx + 1 + removeCount);
  slots.splice(anchorIdx + 1, removeCount, ...replacements);
  if (recorder) {
    recorder.action(
      actionMessage(
        absorbed.map((s) => recorder.label(s)),
        overconstrained,
      ),
    );
  }
  return anchorIdx + 1 + replacements.length;
}

// Restore the original leg in the tracker (untracked at the top of
// backwardBypassCascade) and place a localized insufficient travel that
// only touches [current, immediate prev]. Called from every cascade exit
// that doesn't place a new A->C travel — single place to keep the
// untrack/retrack ledger balanced.
function cascadeFallbackPrev(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  travelManager: TravelManager,
): number {
  travelManager.trackLeg(action.prevLocation, action.nextLocation);
  return bleedSingleSideInsufficient(slots, i, action, "prev");
}

// Look up the wrapper end of a CategorySlot by matching against its
// Category's recurring timeSlots for the slot's day. Returns null if no
// matching wrapper period contains the slot (which can happen if the slot's
// boundaries were clipped by a gap rather than the wrapper itself).
function findCategoryWrapperEnd(
  slot: CategorySlot,
  categories: Category[],
): Date | null {
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
      return period.end;
    }
  }
  return null;
}

// Helper that replicates the original "insufficient single-side bleed"
// placement — used as a fallback when the cascade can't find an anchor.
function bleedSingleSideInsufficient(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  side: "prev" | "next",
): number {
  const slot = slots[i] as AvailableSlot;
  const { prevLocation, nextLocation, travelMinutes } = action;
  const neighborIdx = side === "prev" ? i - 1 : i + 1;
  const neighbor = slots[neighborIdx];
  if (
    !neighbor ||
    (neighbor.type !== "available" && neighbor.type !== "category")
  ) {
    return fillCurrentWithAlert(slots, i, action);
  }
  const neighborDur = neighbor.durationMinutes;
  const consumeFromNeighbor = neighborDur;
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
    { insufficientTravel: true, requiredTravelMinutes: travelMinutes },
  );
  if (side === "prev") {
    return spliceBleedPrev(
      slots,
      i,
      neighborIdx,
      neighbor,
      travel,
      true,
      travelStart,
    );
  }
  return spliceBleedNext(
    slots,
    i,
    neighborIdx,
    neighbor,
    travel,
    true,
    travelEnd,
  );
}

// ---------------------------------------------------------------------------
// Action: Available with next=Available/Category, insufficient — forward
// cascade with iterative destination replanning.
//
// Walks forward from the current Available slot through subsequent placeable
// slots (Available / Category) accumulating duration. At each step past the
// immediate next, REPLAN: retarget the travel to that slot's location
// (untrack the old leg, compute and track the new one). Then check fit:
//
//   - T <= consumed:           replanned travel fits inside the already-
//                              consumed slots. End exactly at this slot's
//                              start (slot itself preserved). The travel
//                              slot spans the consumed region — if larger
//                              than T, the geometric overconstrained flag
//                              fires from the post-loop check.
//   - consumed < T <= newCum:  bleed into this slot (partial split) and
//                              the slot's leftover head is preserved. The
//                              travel slot duration equals T exactly — no
//                              wasted space, NOT overconstrained.
//   - T > newCum:              consume this slot and cascade to the next.
//
// `overconstrained` is computed geometrically AFTER placement: only when
// the travel slot duration exceeds the actual travel duration T. Cascading
// past cats with an exact-fit bleed isn't overconstrained — the slot fits.
//
// Hard stop (Occupied / Travel / end of slots): if the Occupied has a
// location we haven't reached yet, replan once more straight to it. Then
// place a travel up to slot.start; insufficient = (consumed < T).
// ---------------------------------------------------------------------------

function forwardBypassCascade(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  travelManager: TravelManager,
  recorder?: TravelPassRecorder,
): number {
  const current = slots[i] as AvailableSlot;
  const A = action.prevLocation;
  let destination = action.nextLocation;
  let T = action.travelMinutes;

  recorder?.decision(M.forwardBypassCascade.header, 5);

  let consumed = 0;
  let consumeIdx = i;
  const consumedCategoryIds: string[] = [];
  let partialSplitTime: Date | null = null;
  let hardStop = false;
  // When a replan triggers, we stop the cascade at the start of the new-
  // destination slot. endSlotIdx is the index of that slot (preserved, not
  // consumed); we record it separately so the splice math is unambiguous.
  let endAtSlotStart = false;
  let endSlotIdx = -1;

  while (consumeIdx < slots.length) {
    const slot = slots[consumeIdx];

    if (slot.type === "occupied" || slot.type === "travel") {
      if (recorder) {
        recorder.decision(
          M.forwardBypassCascade.anchorHardStop(
            consumeIdx,
            recorder.label(slot),
          ),
          6,
        );
      }
      // Hard stop. If we've cascaded past cat1 and this Occupied has a
      // location, retarget the travel straight to it (per spec: "make a
      // travel directly from the initial event to the next Occupied
      // item"). The travelEnd lands at slot.start either way; the
      // insufficient/overconstrained markers are decided below.
      if (
        consumeIdx > i + 1 &&
        slot.type === "occupied" &&
        slot.locationId &&
        slot.locationId !== destination
      ) {
        const newT = travelManager.getTravelTime(
          A,
          slot.locationId,
          current.end,
        );
        if (newT > 0) {
          travelManager.untrackLeg(A, destination);
          travelManager.trackLeg(A, slot.locationId);
          destination = slot.locationId;
          T = newT;
          recorder?.decision(
            M.forwardBypassCascade.retargetOccupied(newT),
            7,
          );
        }
      }
      hardStop = true;
      break;
    }

    // Abort if we'd cross a later Available slot — its free time shouldn't
    // be sacrificed to a forced cascade routing. Fall back to a simple
    // insufficient placement that fills only the starting Avail; cats
    // walked through stay untouched so their natural transitions still
    // fire on subsequent walker iterations.
    if (consumeIdx > i && slot.type === "available") {
      if (recorder) {
        recorder.decision(
          M.forwardBypassCascade.anchorAbortAvailable(
            consumeIdx,
            recorder.label(slot),
          ),
          6,
        );
      }
      travelManager.untrackLeg(A, destination);
      travelManager.trackLeg(action.prevLocation, action.nextLocation);
      const result = fillCurrentWithAlert(slots, i, action);
      recorder?.action(M.forwardBypassCascade.fillCurrentWithAlertAction);
      return result;
    }

    // Only break/bleed at Category slots — Avails are transit space, not
    // destinations the user wants to land in. Replan + break at consumeIdx
    // > i+1 (past cat1, the original destination). Bleed allowed at i+1
    // too (cat1 with original destination).
    if (slot.type === "category") {
      if (consumeIdx > i + 1) {
        const slotLoc = slot.currentLocationId;
        if (slotLoc && slotLoc !== destination) {
          const newT = travelManager.getTravelTime(A, slotLoc, current.end);
          if (newT > 0) {
            travelManager.untrackLeg(A, destination);
            travelManager.trackLeg(A, slotLoc);
            destination = slotLoc;
            T = newT;
            if (recorder) {
              recorder.decision(
                M.forwardBypassCascade.anchorRetarget(
                  consumeIdx,
                  recorder.label(slot),
                  newT,
                ),
                6,
              );
            }
          }
        }

        if (T <= consumed) {
          recorder?.decision(
            M.forwardBypassCascade.endAtSlotStart(T, consumed, consumeIdx),
            7,
          );
          endAtSlotStart = true;
          endSlotIdx = consumeIdx;
          break;
        }
      }

      const slotDur = slot.durationMinutes;
      if (consumed + slotDur >= T) {
        const remaining = T - consumed;
        partialSplitTime = new Date(slot.start.getTime() + remaining * 60000);
        if (remaining > 0) consumedCategoryIds.push(slot.categoryId);
        consumed = T;
        recorder?.decision(
          M.forwardBypassCascade.partialSplit(consumeIdx, remaining),
          7,
        );
        break;
      }
      if (recorder) {
        recorder.decision(
          M.forwardBypassCascade.anchorConsume(
            consumeIdx,
            recorder.label(slot),
            slotDur,
          ),
          6,
        );
      }
    }

    if (slot.type === "category") consumedCategoryIds.push(slot.categoryId);
    consumed += slot.durationMinutes;
    consumeIdx += 1;
  }

  let travelEnd: Date;
  let insufficient = false;

  if (endAtSlotStart) {
    travelEnd = slots[endSlotIdx].start;
    insufficient = consumed < T;
  } else if (partialSplitTime) {
    travelEnd = partialSplitTime;
  } else if (hardStop) {
    travelEnd = slots[consumeIdx].start;
    insufficient = consumed < T;
  } else if (consumed < T) {
    travelEnd = consumeIdx > i ? slots[consumeIdx - 1].end : current.end;
    insufficient = true;
  } else {
    travelEnd = consumeIdx > i ? slots[consumeIdx - 1].end : current.end;
  }

  // Geometric overconstrained: travel slot is bigger than the actual travel
  // duration (wasted space). Exact-fit bleed cases produce slot == T and
  // stay clean. Insufficient cases never set this flag.
  const travelSlotMinutes = Math.floor(
    (travelEnd.getTime() - current.start.getTime()) / 60000,
  );
  const overconstrained = !insufficient && travelSlotMinutes > T;

  const travel = createTravelSlot(
    current.start,
    travelEnd,
    A,
    destination,
    "preliminary",
    uuidv4(),
    {
      insufficientTravel: insufficient,
      requiredTravelMinutes: insufficient ? T : 0,
      overconstrained,
    },
  );
  travel.consumedCategoryIds = consumedCategoryIds;

  const replacements: Slot[] = [travel];
  let removeCount: number;

  if (endAtSlotStart) {
    // The slot at endSlotIdx is preserved.
    removeCount = endSlotIdx - i;
  } else if (partialSplitTime && consumeIdx < slots.length) {
    const partial = slots[consumeIdx];
    if (partial.type === "available" || partial.type === "category") {
      replacements.push(
        shortenPlaceableAtStart(partial, partialSplitTime, destination),
      );
      removeCount = consumeIdx - i + 1;
    } else {
      removeCount = consumeIdx - i;
    }
  } else {
    removeCount = consumeIdx - i;
  }

  const absorbed = slots.slice(i, i + removeCount);
  slots.splice(i, removeCount, ...replacements);
  if (recorder) {
    recorder.action(
      M.forwardBypassCascade.action(
        absorbed.map((s) => recorder.label(s)),
        insufficient,
        overconstrained,
      ),
    );
  }
  // Return i + 1 so the walker lands on slots[i+1] — either the preserved
  // slot (endAtSlotStart / hard stop) or the shortened cat after bleed.
  // In the bleed case, the shortened cat's exit edge needs to fire so a
  // follow-up transition travel from the cat's location can be placed.
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
  recorder?: TravelPassRecorder,
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
    recorder?.decision(M.bleedAcrossCategoryBoundary.trespassBoundary(half), 2);
    if (recorder) {
      recorder.action(
        M.bleedAcrossCategoryBoundary.trespassAction(
          recorder.label(current),
          recorder.label(next),
        ),
      );
    }
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
      durationMinutes: Math.floor(
        (travelStart.getTime() - current.start.getTime()) / 60000,
      ),
      nextLocationId: current.currentLocationId,
      isFinal: undefined,
    });
  } else {
    travel.consumedCategoryIds = (travel.consumedCategoryIds ?? []).concat(
      current.categoryId,
    );
  }

  replacements.push(travel);

  const nextConsumed = bleedNext >= nextDur;
  if (!nextConsumed) {
    replacements.push({
      ...next,
      start: travelEnd,
      durationMinutes: Math.floor(
        (next.end.getTime() - travelEnd.getTime()) / 60000,
      ),
      prevLocationId: next.currentLocationId,
    });
  } else {
    travel.consumedCategoryIds = (travel.consumedCategoryIds ?? []).concat(
      next.categoryId,
    );
  }

  const travelIdx = replacements.indexOf(travel);
  slots.splice(i, 2, ...replacements);
  if (recorder) {
    recorder.action(
      M.bleedAcrossCategoryBoundary.action(
        bleedCurrent,
        currentConsumed,
        recorder.label(current),
        nextConsumed,
        recorder.label(next),
      ),
    );
  }
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
  start: Date,
  end: Date,
  prevLocationId: string | null,
  nextLocationId: string | null,
): AvailableSlot {
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
      durationMinutes: Math.floor(
        (newEnd.getTime() - source.start.getTime()) / 60000,
      ),
      nextLocationId: newNextLocationId,
      trespassingEnd: undefined,
      isFinal: undefined,
    };
  }
  return {
    ...source,
    end: newEnd,
    durationMinutes: Math.floor(
      (newEnd.getTime() - source.start.getTime()) / 60000,
    ),
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
      durationMinutes: Math.floor(
        (source.end.getTime() - newStart.getTime()) / 60000,
      ),
      prevLocationId: newPrevLocationId,
      trespassingStart: undefined,
    };
  }
  return {
    ...source,
    start: newStart,
    durationMinutes: Math.floor(
      (source.end.getTime() - newStart.getTime()) / 60000,
    ),
    prevLocationId: newPrevLocationId,
  };
}
