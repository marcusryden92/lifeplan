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
import {
  collectShardSources,
  createTravelShards,
  findTravelShardSpan,
  restoreAbsorbedRange,
  shardSourceFromAvailable,
  shardSourceFromCategory,
  type ShardSource,
} from "../../utils/timeSlotUtils";
import { dropUnreachableCategoryVisits } from "./dropUnreachableCategoryVisits";
import { TravelPassRecorder } from "./TravelPassRecorder";
import { M } from "./travelPassMessages";
import {
  detectBleedTrimmedCat,
  findCategoryWrapperEnd,
  findRecentTravelBehind,
  restoreBleedTrimmedCat,
  walkForwardForFit,
} from "./travelPassUtils";
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

// ---------------------------------------------------------------------------
// Current type: Available
// ---------------------------------------------------------------------------

// Classification of the two neighbors used by handleAvailable's dispatch.
// "soft" = Available or Category (both can be bled into / across).
// "hard" = Occupied (no bleeding).
type NeighborKind = "soft" | "hard" | "travel" | "missing";

function classifyNeighbor(slot: Slot | null): NeighborKind {
  if (!slot) return "missing";
  if (slot.type === "available" || slot.type === "category") return "soft";
  if (slot.type === "occupied") return "hard";
  return "travel";
}

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

  // Current size: not large enough for travel — dispatch on (prev, next).
  const prev = i > 0 ? slots[i - 1] : null;
  const next = i + 1 < slots.length ? slots[i + 1] : null;
  const nextKind = classifyNeighbor(next);

  // Forward walker invariant: a Travel slot at i+1 means the next transition
  // was already placed, so the current transition is stale. Same handling
  // regardless of prev type.
  if (nextKind === "travel") {
    travelManager.untrackLeg(action.prevLocation, action.nextLocation);
    logInconsistency(
      `Available with Next=Travel (prev=${prev?.type ?? "none"}) — should not occur on forward walk`,
    );
    recorder?.decision(M.handleAvailable.nextIsTravelDecision, 2);
    recorder?.action(M.handleAvailable.skipInconsistent);
    return i + 1;
  }

  // Prev=Travel (slots[i-1] directly OR slots[i-2] across a transparent prev
  // Available leftover) — absorb the prev travel and replan A→C. This takes
  // precedence over the soft/hard prev dispatch below.
  const prevTravel = findPrevTravelForAvailable(slots, i);
  if (prevTravel && next) {
    recorder?.decision(
      M.handleAvailable.prevIsTravel(
        prevTravel.travelIndex,
        recorder.label(prevTravel.travel),
      ),
      2,
    );
    recorder?.decision(M.handleAvailable.nextAbsorbReplan(next.type), 3);
    return absorbAndReplan(
      slots,
      i,
      action,
      prevTravel,
      travelManager,
      recorder,
    );
  }

  // Dispatch on the (prevKind, nextKind) shape. Category and Available are
  // both "soft" predecessors that can bleed time backwards; Occupied is
  // "hard". The asymmetry on the next side (bleedIntoPrev vs
  // bleedAcrossPrevCurrentNext) only depends on next's type.
  const prevKind = classifyNeighbor(prev);
  if (prevKind === "soft" && nextKind === "soft") {
    recorder?.decision(M.handleAvailable.prevSoft(prev!.type), 2);
    recorder?.decision(M.handleAvailable.nextBleedAcross(next!.type), 3);
    const result = bleedAcrossPrevCurrentNext(slots, i, action);
    recorder?.action(M.handleAvailable.bleedAcrossAction);
    return result;
  }
  if (prevKind === "soft" && nextKind === "hard") {
    recorder?.decision(M.handleAvailable.prevSoft(prev!.type), 2);
    recorder?.decision(M.handleAvailable.nextOccupiedBleedIntoPrev, 3);
    return bleedIntoPrev(slots, i, action, travelManager, categories, recorder);
  }
  if (prevKind === "hard" && nextKind === "soft") {
    recorder?.decision(M.handleAvailable.prevOccupied, 2);
    recorder?.decision(M.handleAvailable.nextBleedIntoNext(next!.type), 3);
    return bleedIntoNext(slots, i, action, travelManager, recorder);
  }
  if (prevKind === "hard" && nextKind === "hard") {
    recorder?.decision(M.handleAvailable.prevOccupied, 2);
    recorder?.decision(M.handleAvailable.nextOccupiedFillCurrent, 3);
    const result = fillCurrentWithAlert(slots, i, action);
    recorder?.action(M.handleAvailable.fillCurrentWithAlertAction);
    return result;
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

  // Category-to-category transitions are owned by the earlier cat's exit edge.
  if (prev.type === "category") {
    recorder?.decision(M.handleCategoryEntryEdge.prevCategory, 1);
    return i;
  }

  // Look behind for a Travel that may already carry this transition. The
  // helper transparently walks past an Available leftover or a chain of
  // Anywhere Occupieds. A located Occupied is opaque (returns null).
  const recent = findRecentTravelBehind(slots, i - 1);

  if (prev.type === "travel") {
    // recent is guaranteed non-null and === slots[i-1].
    if (prev.travelToLocationId === slot.currentLocationId) {
      recorder?.decision(M.handleCategoryEntryEdge.prevTravelEndsAtCurrent, 1);
      return i;
    }
    if (prev.travelToLocationId !== slot.prevLocationId) {
      logInconsistency(
        `Category entry edge: prev Travel destination ${prev.travelToLocationId} doesn't match slot.prevLocationId ${slot.prevLocationId}`,
      );
      recorder?.decision(M.handleCategoryEntryEdge.prevTravelUnexpectedDest, 1);
      return i;
    }
    recorder?.decision(M.handleCategoryEntryEdge.prevTravelMatchesPrevLoc, 1);
  } else if (prev.type === "available") {
    // The leading Available was already processed; if it carried the
    // transition there must be a Travel ending at current behind it.
    if (recent && recent.travel.travelToLocationId === slot.currentLocationId) {
      recorder?.decision(
        M.handleCategoryEntryEdge.prevAvailableWithTravelAtPrevPrev(recent.idx),
        1,
      );
      return i;
    }
    logInconsistency(
      "Category entry edge: prev Available without matching Travel at slots[i-2]",
    );
    recorder?.decision(
      M.handleCategoryEntryEdge.prevAvailableNoMatchingTravel,
      1,
    );
    return i;
  } else if (prev.type === "occupied") {
    // Anywhere Occupied chains may hide an earlier Travel landing at current.
    if (
      prev.locationId == null &&
      recent &&
      recent.travel.travelToLocationId === slot.currentLocationId
    ) {
      recorder?.decision(
        M.handleCategoryEntryEdge.prevAnywhereOccupiedHandled(recent.idx),
        1,
      );
      return i;
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

    const half = action.travelMinutes / 2;
    const symFails =
      half >= slot.durationMinutes || half >= next.durationMinutes;

    // Backward-cascade pre-check: when sym bleed would fail AND a located
    // Occupied sits flush against cat2 at a different location, the user's
    // real next fixed point is that Occupied. Try backward cascade first —
    // re-target the natural travel toward the Occupied's location and
    // absorb cat1+cat2 (and possibly more) into one slot. Falls back to
    // the existing forward/symmetric strategies if no anchor fits.
    if (symFails) {
      const afterNext = i + 2 < slots.length ? slots[i + 2] : null;
      if (
        afterNext &&
        afterNext.type === "occupied" &&
        afterNext.locationId &&
        afterNext.locationId !== next.currentLocationId &&
        afterNext.start.getTime() === next.end.getTime()
      ) {
        if (recorder) {
          recorder.decision(
            M.handleCategoryExitEdge.symFailsTryBackwardCascade(
              half,
              recorder.label(afterNext),
            ),
            2,
          );
        }
        const backwardResult = absorbAndReplanBackward(
          slots,
          i,
          i + 2,
          action,
          travelManager,
          categories,
          recorder,
        );
        if (backwardResult !== null) return backwardResult;
        recorder?.decision(
          M.handleCategoryExitEdge.backwardCascadeFailed,
          2,
        );
      }
    }

    // When symmetric bleed would entirely consume the current cat, the cat
    // is "skippable": prefer forward absorb when a prev Travel exists
    // (replaces it with one longer travel that lands at a later candidate),
    // otherwise forward-cascade through cat[i] using bypassCategoryCascade.
    // The absorb function walks forward through every cat candidate and
    // picks natural-fit (earliest) or latest pre-fit, so the dispatcher
    // doesn't need to pre-check the immediate next cat anymore.
    if (half >= slot.durationMinutes) {
      const prevTravel = findPrevTravelForAvailable(slots, i);
      if (prevTravel) {
        if (recorder) {
          recorder.decision(
            M.handleCategoryExitEdge.symmetricBleedFailsTryAbsorb(
              half,
              slot.durationMinutes,
              prevTravel.travelIndex,
              recorder.label(prevTravel.travel),
            ),
            2,
          );
        }
        return absorbAndReplanIntoNextCategory(
          slots,
          i,
          action,
          prevTravel,
          travelManager,
          categories,
          recorder,
        );
      }
      recorder?.decision(
        M.handleCategoryExitEdge.symmetricBleedFailsForwardCascade(
          half,
          slot.durationMinutes,
        ),
        2,
      );
      return bypassCategoryCascade(
        slots,
        i,
        action,
        travelManager,
        recorder,
      );
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
      // When set, the absorbed region also includes the tail of the Available
      // at this index — the cascade extended backward into it by exactly the
      // missing minutes so the natural A→C travel fits. The placement helper
      // shortens the Available's tail and includes it in the absorb splice.
      precedingAvailableIdx?: number;
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
      // Treat the whole shard span as one anchor: a logical travel may
      // span multiple consecutive shards sharing a travelId. We evaluate
      // against the span's earliest shard (origin) and skip past the
      // whole span if it doesn't fit.
      const span = findTravelShardSpan(slots, idx);
      if (!span) {
        idx--;
        continue;
      }
      const spanHead = span.shards[0];
      if (recorder) {
        recorder.decision(
          M.cascadeWalk.anchorTryAbsorbTravel(
            span.startIdx,
            recorder.label(spanHead),
          ),
          decisionDepth,
        );
      }
      const A = span.travelFromLocationId;
      if (A && A !== destination) {
        const TDirect = travelManager.getTravelTime(A, destination, regionEnd);
        if (TDirect > 0) {
          const regionStart = span.travelStart;
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
              anchorIdx: span.startIdx,
              anchor: spanHead,
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

          // Doesn't fit by itself, but the slot before the travel span may
          // be an Available whose tail is at A — eating a small piece of it
          // can stretch the region just enough for the natural A→C travel.
          // Only valid when Available.nextLocationId === A (the user lands
          // at A by the end of the Available, so the eaten tail is cleanly
          // "at A" already).
          const before =
            span.startIdx > 0 ? slots[span.startIdx - 1] : null;
          if (
            before &&
            before.type === "available" &&
            before.nextLocationId === A
          ) {
            const extensionNeeded = TDirect - regionMinutes;
            if (
              extensionNeeded > 0 &&
              extensionNeeded <= before.durationMinutes
            ) {
              recorder?.decision(
                M.cascadeWalk.extendIntoPrecedingAvailable(
                  extensionNeeded,
                  span.startIdx - 1,
                ),
                decisionDepth + 1,
              );
              return {
                kind: "travel",
                anchorIdx: span.startIdx,
                anchor: spanHead,
                A,
                TDirect,
                regionStart: new Date(
                  before.end.getTime() - extensionNeeded * 60000,
                ),
                regionMinutes: TDirect,
                precedingAvailableIdx: span.startIdx - 1,
              };
            }
          }
        }
      }
      // Doesn't fit through this travel span; walk past it entirely.
      idx = span.startIdx - 1;
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
      const slotStart = useWrapperEnd ? wrapperEnd : anchor.end;
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

  // Case 1: slots[i-1] is Travel (or last shard of a span). Span-aware:
  // walk back to the span's first shard so absorb operations cover all
  // shards belonging to one logical travel.
  if (immediate.type === "travel") {
    const span = findTravelShardSpan(slots, i - 1);
    if (!span) return null;
    const firstShard = span.shards[0];
    const availableIndex =
      span.startIdx > 0 && slots[span.startIdx - 1].type === "available"
        ? span.startIdx - 1
        : null;
    return {
      travel: firstShard,
      travelIndex: span.startIdx,
      availableIndex,
    };
  }

  // Case 2: slots[i-1] is Available leftover with Travel span behind it.
  if (immediate.type === "available" && i >= 2) {
    const before = slots[i - 2];
    if (before.type === "travel") {
      const span = findTravelShardSpan(slots, i - 2);
      if (!span) return null;
      return {
        travel: span.shards[0],
        travelIndex: span.startIdx,
        availableIndex: i - 1,
      };
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

  const shards = createTravelShards(
    [shardSourceFromAvailable(slot, travelStart, travelEnd)],
    uuidv4(),
    prevLocation,
    nextLocation,
    "preliminary",
  );

  const replacements: Slot[] = [];
  if (placeAtSlotStart) {
    replacements.push(...shards);
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
    replacements.push(...shards);
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

  const shards = createTravelShards(
    [shardSourceFromCategory(slot, travelStart, travelEnd)],
    uuidv4(),
    prevLocation,
    nextLocation,
    "preliminary",
    { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
  );

  const replacements: Slot[] = [...shards];
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

  const shards = createTravelShards(
    [shardSourceFromCategory(slot, travelStart, travelEnd)],
    uuidv4(),
    prevLocation,
    nextLocation,
    "preliminary",
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
  replacements.push(...shards);

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
  const shards = createTravelShards(
    [shardSourceFromAvailable(slot, slot.start, slot.end)],
    uuidv4(),
    action.prevLocation,
    action.nextLocation,
    "preliminary",
    {
      insufficientTravel: true,
      requiredTravelMinutes: action.travelMinutes,
    },
  );
  slots.splice(i, 1, ...shards);
  return i + shards.length;
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
  const travelStart = new Date(slot.start.getTime() - consumeFromPrev * 60000);

  const sources: ShardSource[] = [];
  if (prev.type === "available") {
    sources.push(shardSourceFromAvailable(prev, travelStart, prev.end));
  } else {
    sources.push(shardSourceFromCategory(prev, travelStart, prev.end));
  }
  sources.push(shardSourceFromAvailable(slot, slot.start, slot.end));

  const shards = createTravelShards(
    sources,
    uuidv4(),
    prevLocation,
    nextLocation,
    "preliminary",
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
    shards,
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
  const travelEnd = new Date(slot.end.getTime() + consumeFromNext * 60000);

  const sources: ShardSource[] = [
    shardSourceFromAvailable(slot, slot.start, slot.end),
  ];
  if (next.type === "available") {
    sources.push(shardSourceFromAvailable(next, next.start, travelEnd));
  } else {
    sources.push(shardSourceFromCategory(next, next.start, travelEnd));
  }

  const shards = createTravelShards(
    sources,
    uuidv4(),
    prevLocation,
    nextLocation,
    "preliminary",
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
    shards,
    nextConsumed,
    travelEnd,
  );
}

function spliceBleedPrev(
  slots: Slot[],
  curIdx: number,
  prevIdx: number,
  prev: Slot,
  shards: TravelSlot[],
  prevConsumed: boolean,
  travelStart: Date,
): number {
  // Replace [prev, current] with [shortened prev?, ...shards]. Trespass only
  // fires when the category interior is FULLY consumed — partial bleeds
  // just shorten the category without marking a boundary.
  const replacements: Slot[] = [];
  const firstShard = shards[0];

  if (
    !prevConsumed &&
    (prev.type === "available" || prev.type === "category")
  ) {
    replacements.push(
      shortenPlaceableAtEnd(prev, travelStart, firstShard.travelFromLocationId),
    );
  } else if (prevConsumed && prev.type === "category") {
    firstShard.consumedCategoryIds = (firstShard.consumedCategoryIds ?? []).concat(
      prev.categoryId,
    );
  }

  replacements.push(...shards);
  slots.splice(prevIdx, curIdx - prevIdx + 1, ...replacements);
  return prevIdx + replacements.length;
}

function spliceBleedNext(
  slots: Slot[],
  curIdx: number,
  nextIdx: number,
  next: Slot,
  shards: TravelSlot[],
  nextConsumed: boolean,
  travelEnd: Date,
): number {
  // Replace [current, next] with [...shards, shortened next?]. Trespass only
  // on full consumption (see spliceBleedPrev for rationale).
  const replacements: Slot[] = [...shards];
  const lastShard = shards[shards.length - 1];

  if (
    !nextConsumed &&
    (next.type === "available" || next.type === "category")
  ) {
    replacements.push(
      shortenPlaceableAtStart(next, travelEnd, lastShard.travelToLocationId),
    );
  } else if (nextConsumed && next.type === "category") {
    lastShard.consumedCategoryIds = (lastShard.consumedCategoryIds ?? []).concat(
      next.categoryId,
    );
  }

  slots.splice(curIdx, nextIdx - curIdx + 1, ...replacements);
  // Walker lands on the slot AFTER the last shard so a Category neighbor's
  // exit edge can fire on the next iteration.
  return curIdx + shards.length;
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

  // Three source pieces: prev's tail, current's whole, next's head.
  const sources: ShardSource[] = [];
  if (prev.type === "available") {
    sources.push(shardSourceFromAvailable(prev, travelStart, prev.end));
  } else if (prev.type === "category") {
    sources.push(shardSourceFromCategory(prev, travelStart, prev.end));
  }
  sources.push(shardSourceFromAvailable(slot, slot.start, slot.end));
  if (next.type === "available") {
    sources.push(shardSourceFromAvailable(next, next.start, travelEnd));
  } else if (next.type === "category") {
    sources.push(shardSourceFromCategory(next, next.start, travelEnd));
  }

  const shards = createTravelShards(
    sources,
    uuidv4(),
    action.prevLocation,
    action.nextLocation,
    "preliminary",
    {
      insufficientTravel: insufficient,
      requiredTravelMinutes: insufficient ? T : 0,
    },
  );

  const replacements: Slot[] = [];
  const firstShard = shards[0];
  const lastShard = shards[shards.length - 1];

  const prevConsumed = bleedPrev >= prevDur;
  if (
    !prevConsumed &&
    (prev.type === "available" || prev.type === "category")
  ) {
    replacements.push(
      shortenPlaceableAtEnd(prev, travelStart, firstShard.travelFromLocationId),
    );
  } else if (prevConsumed && prev.type === "category") {
    firstShard.consumedCategoryIds = (
      firstShard.consumedCategoryIds ?? []
    ).concat(prev.categoryId);
  }

  const shardStartIdx = replacements.length;
  replacements.push(...shards);

  const nextConsumed = bleedNext >= nextDur;
  if (
    !nextConsumed &&
    (next.type === "available" || next.type === "category")
  ) {
    replacements.push(
      shortenPlaceableAtStart(next, travelEnd, lastShard.travelToLocationId),
    );
  } else if (nextConsumed && next.type === "category") {
    lastShard.consumedCategoryIds = (
      lastShard.consumedCategoryIds ?? []
    ).concat(next.categoryId);
  }

  slots.splice(i - 1, 3, ...replacements);
  // Walker lands on the first slot AFTER the shards — typically the
  // shortened-next so it can be processed on the next iteration.
  return i - 1 + shardStartIdx + shards.length;
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
  const shards = createTravelShards(
    [shardSourceFromCategory(slot, travelStart, travelEnd)],
    uuidv4(),
    action.prevLocation,
    action.nextLocation,
    "preliminary",
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
  replacements.push(...shards);

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

  // Merge prev Available leftover and prev Travel into one extended region.
  // Combined region runs from prevAvailable.start (if any, else prevTravel.start) to current.end.
  const prevAvailable =
    prevTravel.availableIndex !== null
      ? (slots[prevTravel.availableIndex] as AvailableSlot)
      : null;
  const regionStart = prevAvailable?.start ?? prevTravel.travel.start;
  const regionEnd = slot.end;
  const regionStartMs = regionStart.getTime();
  const regionEndMs = regionEnd.getTime();
  const regionMinutes = Math.floor((regionEndMs - regionStartMs) / 60000);

  // Decide the geometry:
  // - regionMinutes >= newDuration: travel fits naturally inside the absorbed
  //   region. Place at the tail; leftover head becomes Available at A.
  // - regionMinutes < newDuration AND next slot is a placeable at C with
  //   enough head room: extend the travel forward by the missing minutes.
  //   The next slot survives as a shortened tail at C.
  // - Otherwise: insufficient — fill the whole region with the travel.
  let actualTravelStart: Date;
  let actualTravelEnd: Date;
  let insufficient: boolean;
  let nextIsExtended = false;

  if (regionMinutes >= newDuration) {
    actualTravelStart = new Date(regionEndMs - newDuration * 60000);
    actualTravelEnd = regionEnd;
    insufficient = false;
  } else {
    const extensionNeeded = newDuration - regionMinutes;
    const next = i + 1 < slots.length ? slots[i + 1] : null;
    const nextHeadLocation =
      next?.type === "category"
        ? next.currentLocationId
        : next?.type === "available"
          ? next.prevLocationId
          : null;
    const canExtend =
      !!next &&
      (next.type === "category" || next.type === "available") &&
      nextHeadLocation === C &&
      next.durationMinutes >= extensionNeeded;
    if (canExtend && next) {
      actualTravelStart = regionStart;
      actualTravelEnd = new Date(
        regionEnd.getTime() + extensionNeeded * 60000,
      );
      insufficient = false;
      nextIsExtended = true;
      recorder?.decision(
        M.absorbAndReplan.forwardExtension(
          regionMinutes,
          newDuration,
          next.type,
          extensionNeeded,
        ),
        4,
      );
    } else {
      actualTravelStart = regionStart;
      actualTravelEnd = regionEnd;
      insufficient = true;
    }
  }

  const firstIdx = prevTravel.availableIndex ?? prevTravel.travelIndex;
  const removeCount = (nextIsExtended ? i + 2 : i + 1) - firstIdx;
  const absorbed = slots.slice(firstIdx, firstIdx + removeCount);
  const shardSources = collectShardSources(
    absorbed,
    actualTravelStart,
    actualTravelEnd,
  );
  const shards = createTravelShards(
    shardSources,
    uuidv4(),
    A,
    C,
    "preliminary",
    {
      insufficientTravel: insufficient,
      requiredTravelMinutes: newDuration,
    },
  );

  const replacements: Slot[] = [];
  if (regionStart.getTime() < actualTravelStart.getTime()) {
    replacements.push({
      type: "available",
      start: regionStart,
      end: actualTravelStart,
      durationMinutes: Math.floor(
        (actualTravelStart.getTime() - regionStart.getTime()) / 60000,
      ),
      prevLocationId: prevAvailable?.prevLocationId ?? A,
      nextLocationId: A,
    });
  }
  replacements.push(...shards);
  if (nextIsExtended) {
    const nextSlot = absorbed[absorbed.length - 1];
    if (nextSlot.type === "category" || nextSlot.type === "available") {
      replacements.push(
        shortenPlaceableAtStart(nextSlot, actualTravelEnd, C),
      );
    }
  }

  slots.splice(firstIdx, removeCount, ...replacements);
  if (recorder) {
    recorder.action(
      M.absorbAndReplan.action(
        absorbed.map((s) => recorder.label(s)),
        insufficient,
      ),
    );
  }
  // When we extend into the next slot, land the walker ON the shortened next
  // so its own exit edge can fire (its prev now matches C, but its next is
  // unchanged so a follow-up transition may still be needed).
  return nextIsExtended
    ? firstIdx + replacements.length - 1
    : firstIdx + replacements.length;
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
        categories,
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
  const firstIdx = prevTravel.availableIndex ?? prevTravel.travelIndex;
  const removeCount = i - firstIdx + 1;
  const absorbed = slots.slice(firstIdx, firstIdx + removeCount);
  const shardSources = collectShardSources(absorbed, travelStart, travelEnd);
  const shards = createTravelShards(
    shardSources,
    uuidv4(),
    A,
    C,
    "preliminary",
    {
      insufficientTravel: insufficient,
      requiredTravelMinutes: newDuration,
    },
  );
  if (shards.length > 0) {
    shards[0].consumedCategoryIds = (
      shards[0].consumedCategoryIds ?? []
    ).concat(category.categoryId);
  }

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
  replacements.push(...shards);

  // Remove [prevAvailable?, prevTravel, ..., category] in one splice.
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
// Action: Cat exit Next=Category but current cat too small for symmetric
// bleed — backward absorb the prev Travel and replan as a single longer
// travel from prev Travel's source location to the NEXT cat's location.
// The new travel starts at baseRegionStart (= prev Travel's start, or the
// leading Available's start if present) and ends at one of:
//   - cat[i].end when newT exactly matches the region.
//   - inside next cat (partial-split) when newT extends past cat[i].end.
//   - next.end (insufficient) when newT overflows past next.
// When newT is SHORTER than the existing region, we leave the placement
// alone and fall back to symmetric bleed — replanning would just waste the
// space the prev Travel already used productively.
// ---------------------------------------------------------------------------

function absorbAndReplanIntoNextCategory(
  slots: Slot[],
  i: number,
  originalAction: TravelProcessingAction,
  prevTravel: PrevTravelMatch,
  travelManager: TravelManager,
  categories: Category[],
  recorder?: TravelPassRecorder,
): number {
  travelManager.untrackLeg(
    originalAction.prevLocation,
    originalAction.nextLocation,
  );
  const oldFrom = prevTravel.travel.travelFromLocationId;
  const oldTo = prevTravel.travel.travelToLocationId;
  if (oldFrom && oldTo) travelManager.untrackLeg(oldFrom, oldTo);

  recorder?.decision(M.absorbAndReplanIntoNextCategory.header, 2);

  const category = slots[i] as CategorySlot;
  const A = prevTravel.travel.travelFromLocationId;

  if (!A) {
    recorder?.decision(M.absorbAndReplanIntoNextCategory.missingLocations, 3);
    return fillCategoryTailOrTrespass(
      slots,
      i,
      originalAction,
      travelManager,
      recorder,
    );
  }

  const prevAvailable =
    prevTravel.availableIndex !== null
      ? (slots[prevTravel.availableIndex] as AvailableSlot)
      : null;
  const firstIdx = prevTravel.availableIndex ?? prevTravel.travelIndex;

  // If the slot immediately before our absorb region is a Category whose end
  // was trimmed by an earlier bleed, recover the original-fabric boundary so
  // the new overconstrained travel starts there instead of on the bleed seam.
  const bleedTrimmedPrevCat =
    !prevAvailable && firstIdx > 0
      ? detectBleedTrimmedCat(slots[firstIdx - 1], categories)
      : null;

  const baseRegionStart = bleedTrimmedPrevCat
    ? bleedTrimmedPrevCat.wrapperEnd
    : (prevAvailable?.start ?? prevTravel.travel.start);

  const fit = walkForwardForFit({
    slots,
    startIdx: i + 1,
    referenceStartTime: baseRegionStart,
    initialConsumedCategoryIds: [category.categoryId],
    availableCandidateMode: "transit-only",
    travelManager,
    origin: A,
    referenceTime: (slot) => slot.end,
    hardStopReferenceTime: category.end,
  });

  const consumed = fit.consumed;
  const consumedCategoryIds = [...fit.consumedCategoryIds];
  let destination: string;
  let T: number;
  let travelEnd: Date;
  let removeCount: number;
  let extendsIntoNext = false;
  let insufficient = false;
  let landingSurvivor: Slot | null = null;
  const finalConsumedIds = [...consumedCategoryIds];

  if (fit.kind === "naturalFit") {
    destination = fit.destination;
    T = fit.T;
    travelEnd = fit.travelEnd;
    removeCount = fit.idx - firstIdx + 1;
    extendsIntoNext = true;
    if (fit.slot.type === "category") {
      finalConsumedIds.push(fit.slot.categoryId);
    } else if (fit.slot.type === "travel" && fit.slot.consumedCategoryIds) {
      // Zero-distance sentinel landing — transfer the consumed cats.
      finalConsumedIds.push(...fit.slot.consumedCategoryIds);
    }
    if (travelEnd.getTime() < fit.slot.end.getTime()) {
      landingSurvivor = buildLandingSurvivor(
        fit.slot,
        travelEnd,
        destination,
      );
    }
    recorder?.decision(
      M.absorbAndReplanIntoNextCategory.naturalFit(fit.idx, fit.destination, T),
      3,
    );
  } else if (fit.kind === "preFit") {
    destination = fit.destination;
    T = fit.T;
    travelEnd = fit.slot.start;
    removeCount = fit.idx - firstIdx;
    recorder?.decision(
      M.absorbAndReplanIntoNextCategory.preFit(
        fit.idx,
        fit.destination,
        T,
        consumed,
      ),
      3,
    );
  } else if (fit.kind === "hardStop" && fit.pinnedDestination) {
    destination = fit.pinnedDestination;
    T = fit.pinnedT;
    travelEnd = fit.hardStopSlot.start;
    removeCount = fit.idx - firstIdx;
    insufficient = consumed < T;
    recorder?.decision(
      M.absorbAndReplanIntoNextCategory.hardStop(fit.idx, destination, T),
      3,
    );
  } else {
    // No usable candidate (hardStop with no pinned dest, or exhausted).
    // Re-track and fall back to symmetric bleed.
    travelManager.trackLeg(
      originalAction.prevLocation,
      originalAction.nextLocation,
    );
    if (oldFrom && oldTo) travelManager.trackLeg(oldFrom, oldTo);
    recorder?.decision(M.absorbAndReplanIntoNextCategory.noCandidate, 3);
    return bleedAcrossCategoryBoundary(
      slots,
      i,
      originalAction,
      travelManager,
      recorder,
    );
  }

  travelManager.trackLeg(A, destination);

  // Shrink to natural, but don't shrink past the first absorbed Category-
  // typed slot — see firstNonFreeAbsorbedStart. Any head leftover stays
  // within the leading Available-like run (prev Available + prev Travel
  // shard from Available source). Cats and sentinels in the absorb get
  // fully covered by the new travel.
  const absorbed = slots.slice(firstIdx, firstIdx + removeCount);
  const naturalTravelStart = new Date(travelEnd.getTime() - T * 60000);
  const safeShrinkBoundary = firstNonFreeAbsorbedStart(absorbed);
  let actualTravelStart: Date;
  let overconstrained = false;
  if (insufficient) {
    actualTravelStart = baseRegionStart;
  } else if (
    safeShrinkBoundary &&
    naturalTravelStart.getTime() > safeShrinkBoundary.getTime()
  ) {
    actualTravelStart = safeShrinkBoundary;
    overconstrained = true;
  } else {
    actualTravelStart =
      naturalTravelStart.getTime() > baseRegionStart.getTime()
        ? naturalTravelStart
        : baseRegionStart;
  }
  const headLeftover =
    !insufficient && actualTravelStart.getTime() > baseRegionStart.getTime();

  const shardSources = collectShardSources(
    absorbed,
    actualTravelStart,
    travelEnd,
  );
  const shards = createTravelShards(
    shardSources,
    uuidv4(),
    A,
    destination,
    "preliminary",
    {
      insufficientTravel: insufficient,
      requiredTravelMinutes: insufficient || overconstrained ? T : 0,
      overconstrained: overconstrained || undefined,
    },
  );
  if (shards.length > 0) {
    shards[0].consumedCategoryIds = (
      shards[0].consumedCategoryIds ?? []
    ).concat(finalConsumedIds);
  }

  const replacements: Slot[] = [];
  if (headLeftover) {
    // Free time at A inside the leading Available-like run before the first
    // absorbed cat.
    replacements.push({
      type: "available",
      start: baseRegionStart,
      end: actualTravelStart,
      durationMinutes: Math.floor(
        (actualTravelStart.getTime() - baseRegionStart.getTime()) / 60000,
      ),
      prevLocationId: A,
      nextLocationId: A,
    });
  }
  replacements.push(...shards);
  if (landingSurvivor) replacements.push(landingSurvivor);

  if (bleedTrimmedPrevCat) restoreBleedTrimmedCat(bleedTrimmedPrevCat);

  slots.splice(firstIdx, removeCount, ...replacements);
  if (recorder) {
    recorder.action(
      M.absorbAndReplanIntoNextCategory.action(
        absorbed.map((s) => recorder.label(s)),
        extendsIntoNext,
        insufficient,
      ),
    );
  }
  return firstIdx + replacements.length;
}

// ---------------------------------------------------------------------------
// Action: Cat1 exit edge, Next=Category, symmetric bleed fails AND a
// located Occupied sits right after Cat2 at a different location.
//
// Mirror of absorbAndReplanIntoNextCategory. Cat1+Cat2 are always absorbed
// (Cat2 first, then Cat1) — Cat2 because the asymmetric "fill Cat2" placement
// would land the user at Cat2.loc exactly when the Occupied at a different
// location starts; Cat1 follows when natural T(Cat1.loc→Occupied.loc) doesn't
// fit inside Cat2. Walk backward through earlier slots accumulating consumed
// minutes, re-targeting the natural travel at each anchor's exit location.
//
// At each anchor candidate:
//   - preFit   (newT ≤ consumed):       overconstrained. Travel slot spans
//                                       the consumed region; actual T is
//                                       smaller. Anchor slot preserved.
//   - natural  (consumed < newT ≤ +dur): exact fit. Travel of size newT ends
//                                       at regionEnd. Anchor slot's head
//                                       preserved.
//   - overflow (else):                  consume the whole anchor slot, walk
//                                       back to slots[idx - 1].
//
// First-fit wins. Hard stop on located Occupied or end of array → return null
// so the caller falls back to the existing trespass placement.
//
// Available anchors are only valid when prev==next==A (transit-at-A). Travel
// anchors absorb the whole travel and switch origin to travel.from; the
// preFit case at a Travel anchor would leave the user at travel.to at
// travel.end while a new travel starts at travel.from from the same point —
// no continuity, so we force overflow there.
// ---------------------------------------------------------------------------

function absorbAndReplanBackward(
  slots: Slot[],
  catIdx: number,
  occupiedIdx: number,
  originalAction: TravelProcessingAction,
  travelManager: TravelManager,
  categories: Category[],
  recorder?: TravelPassRecorder,
): number | null {
  const cat2 = slots[catIdx + 1] as CategorySlot;
  const occupied = slots[occupiedIdx] as OccupiedSlot;
  if (!occupied.locationId) return null;

  const destination = occupied.locationId;
  const regionEnd = occupied.start;

  let consumed = cat2.durationMinutes;
  let idx = catIdx;
  let chosen:
    | {
        idx: number;
        slot: Slot;
        kind: "natural" | "preFit";
        origin: string;
        T: number;
        travelStart: Date;
      }
    | null = null;
  const absorbedTravelSlots: TravelSlot[] = [];

  while (idx >= 0) {
    const slot = slots[idx];

    if (slot.type === "occupied") {
      // Hard stop on any Occupied — even Anywhere ones — since crossing one
      // means the user already had a fixed thing on the calendar and we
      // shouldn't reroute around it.
      break;
    }

    const slotDur = slot.durationMinutes;
    let origin: string | null = null;
    let isTravelAnchor = false;

    if (slot.type === "category") {
      origin = slot.currentLocationId;
    } else if (slot.type === "available") {
      if (slot.prevLocationId && slot.prevLocationId === slot.nextLocationId) {
        origin = slot.prevLocationId;
      }
    } else if (slot.type === "travel") {
      origin = slot.travelFromLocationId;
      isTravelAnchor = true;
    }

    if (origin && origin !== destination) {
      const newT = travelManager.getTravelTime(origin, destination, regionEnd);
      if (newT > 0) {
        // PreFit is invalid at a Travel anchor (would teleport the user
        // from travel.to back to travel.from at the same instant). Force
        // overflow there.
        if (!isTravelAnchor && newT <= consumed) {
          chosen = {
            idx,
            slot,
            kind: "preFit",
            origin,
            T: newT,
            travelStart: slot.end,
          };
          break;
        }
        if (newT > consumed && newT <= consumed + slotDur) {
          chosen = {
            idx,
            slot,
            kind: "natural",
            origin,
            T: newT,
            travelStart: new Date(regionEnd.getTime() - newT * 60000),
          };
          break;
        }
      }
    }

    if (slot.type === "travel") {
      absorbedTravelSlots.push(slot);
    }
    consumed += slotDur;
    idx -= 1;
  }

  if (!chosen) return null;

  travelManager.untrackLeg(
    originalAction.prevLocation,
    originalAction.nextLocation,
  );
  for (const t of absorbedTravelSlots) {
    if (t.travelFromLocationId && t.travelToLocationId) {
      travelManager.untrackLeg(t.travelFromLocationId, t.travelToLocationId);
    }
  }
  if (chosen.slot.type === "travel") {
    if (chosen.slot.travelFromLocationId && chosen.slot.travelToLocationId) {
      travelManager.untrackLeg(
        chosen.slot.travelFromLocationId,
        chosen.slot.travelToLocationId,
      );
    }
  }
  travelManager.trackLeg(chosen.origin, destination);

  // For a preFit Category anchor, recover the original-fabric boundary by
  // restoring the cat's wrapper end (constrained to <= regionEnd so we never
  // extend the slot past the destination).
  const bleedTrimmedAnchor =
    chosen.kind === "preFit"
      ? detectBleedTrimmedCat(chosen.slot, categories, regionEnd)
      : null;
  const travelEnd = regionEnd;

  // Always shrink to natural duration. The naturalFit case already starts
  // exactly at naturalStart by construction. For preFit, shrink the slot to
  // natural and put the leftover head as Available at chosen.origin.
  const naturalStart = new Date(travelEnd.getTime() - chosen.T * 60000);
  // earliestTravelStart: the anchor's end (restored to wrapperEnd if bleed-
  // trimmed) is the floor for where the new travel can begin.
  const earliestTravelStart = bleedTrimmedAnchor
    ? bleedTrimmedAnchor.wrapperEnd
    : chosen.kind === "preFit"
      ? chosen.slot.end
      : chosen.travelStart;
  const travelStart =
    naturalStart.getTime() < earliestTravelStart.getTime()
      ? earliestTravelStart
      : naturalStart;
  // overconstrained only when bleed-trimmed anchor forces travel earlier
  // than natural — there's no way to avoid the waste without leaving a hole.
  const overconstrained =
    travelStart.getTime() < naturalStart.getTime();

  let absorbStartIdx: number;
  let removeCount: number;
  const leadingReplacements: Slot[] = [];

  if (chosen.kind === "natural") {
    absorbStartIdx = chosen.idx;
    removeCount = catIdx + 2 - chosen.idx;

    if (chosen.slot.type === "available" || chosen.slot.type === "category") {
      if (chosen.slot.start.getTime() < travelStart.getTime()) {
        leadingReplacements.push(
          shortenPlaceableAtEnd(chosen.slot, travelStart, chosen.origin),
        );
      }
    } else if (chosen.slot.type === "travel") {
      if (chosen.slot.start.getTime() < travelStart.getTime()) {
        leadingReplacements.push(
          makeAvailableLeftover(
            chosen.slot.start,
            travelStart,
            chosen.origin,
            chosen.origin,
          ),
        );
      }
    }
  } else {
    absorbStartIdx = chosen.idx + 1;
    removeCount = catIdx + 1 - chosen.idx;
    // preFit head leftover: between the anchor's end (or wrapperEnd) and the
    // shrunken travel's start, the user is at chosen.origin.
    if (earliestTravelStart.getTime() < travelStart.getTime()) {
      leadingReplacements.push(
        makeAvailableLeftover(
          earliestTravelStart,
          travelStart,
          chosen.origin,
          chosen.origin,
        ),
      );
    }
  }

  const absorbed = slots.slice(absorbStartIdx, absorbStartIdx + removeCount);

  const consumedCategoryIds: string[] = [];
  for (const s of absorbed) {
    if (s.type === "category") consumedCategoryIds.push(s.categoryId);
  }

  const shardSources = collectShardSources(absorbed, travelStart, travelEnd);
  const shards = createTravelShards(
    shardSources,
    uuidv4(),
    chosen.origin,
    destination,
    "preliminary",
    {
      insufficientTravel: false,
      requiredTravelMinutes: 0,
      overconstrained: overconstrained || undefined,
    },
  );
  if (shards.length > 0) {
    shards[0].consumedCategoryIds = (
      shards[0].consumedCategoryIds ?? []
    ).concat(consumedCategoryIds);
  }

  const replacements: Slot[] = [...leadingReplacements, ...shards];

  if (bleedTrimmedAnchor) restoreBleedTrimmedCat(bleedTrimmedAnchor);

  slots.splice(absorbStartIdx, removeCount, ...replacements);

  if (recorder) {
    recorder.decision(
      M.absorbAndReplanBackward.committed(
        chosen.idx,
        recorder.label(chosen.slot),
        chosen.origin,
        chosen.T,
        chosen.kind,
      ),
      3,
    );
    recorder.action(
      M.absorbAndReplanBackward.action(
        absorbed.map((s) => recorder.label(s)),
        chosen.kind === "natural",
        overconstrained,
      ),
    );
  }

  return absorbStartIdx + replacements.length;
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
  // Cat[i] doesn't fit the travel from prev (Occupied) into it. Walk forward
  // looking for a Category to land in (first-fit naturalFit / preFit). Hard
  // stop on Occupied/Travel; end-of-slots without a landing falls back to a
  // pinned destination and ultimately fillCategoryTailOrTrespass().
  travelManager.untrackLeg(action.prevLocation, action.nextLocation);
  recorder?.decision(M.bypassCategoryCascade.header, 3);

  const category = slots[i] as CategorySlot;
  const A = action.prevLocation;

  const fit = walkForwardForFit({
    slots,
    startIdx: i + 1,
    referenceStartTime: category.start,
    initialConsumedCategoryIds: [category.categoryId],
    availableCandidateMode: "always-next",
    travelManager,
    origin: A,
    referenceTime: () => category.end,
    hardStopReferenceTime: category.end,
    onVisit: recorder
      ? (event) => {
          recorder.decision(
            M.bypassCategoryCascade.evaluateCat(
              event.idx,
              recorder.label(event.slot),
              event.T,
            ),
            4,
          );
          if (event.fitKind === "overflow") {
            recorder.decision(
              M.bypassCategoryCascade.overshootSkip(
                event.idx,
                event.T,
                event.slot.durationMinutes,
              ),
              5,
            );
          }
        }
      : undefined,
  });

  const consumed = fit.consumed;
  const consumedCategoryIds = [...fit.consumedCategoryIds];
  let destination: string | null = null;
  let T = 0;
  let travelEnd: Date;
  let insufficient = false;
  let partialSplitTime: Date | null = null;
  let removeCount: number;

  switch (fit.kind) {
    case "naturalFit": {
      destination = fit.destination;
      T = fit.T;
      travelEnd = fit.travelEnd;
      partialSplitTime = fit.travelEnd;
      if (
        fit.slot.type === "category" &&
        travelEnd.getTime() > fit.slot.start.getTime()
      ) {
        consumedCategoryIds.push(fit.slot.categoryId);
      } else if (
        fit.slot.type === "travel" &&
        fit.slot.consumedCategoryIds &&
        travelEnd.getTime() > fit.slot.start.getTime()
      ) {
        consumedCategoryIds.push(...fit.slot.consumedCategoryIds);
      }
      removeCount = fit.idx - i + 1;
      recorder?.decision(
        M.bypassCategoryCascade.partialSplit(fit.idx, fit.remaining),
        5,
      );
      break;
    }
    case "preFit": {
      destination = fit.destination;
      T = fit.T;
      travelEnd = fit.slot.start;
      removeCount = fit.idx - i;
      recorder?.decision(
        M.bypassCategoryCascade.endAtSlotStart(T, consumed, fit.idx),
        5,
      );
      break;
    }
    case "hardStop": {
      if (recorder) {
        recorder.decision(
          M.bypassCategoryCascade.anchorHardStop(
            fit.idx,
            recorder.label(fit.hardStopSlot),
          ),
          4,
        );
      }
      if (fit.pinnedDestination) {
        destination = fit.pinnedDestination;
        T = fit.pinnedT;
        recorder?.decision(M.bypassCategoryCascade.retargetOccupied(T), 5);
      }
      travelEnd = fit.hardStopSlot.start;
      insufficient = consumed < T;
      removeCount = fit.idx - i;
      break;
    }
    case "exhausted": {
      const lastIdx = slots.length - 1;
      travelEnd = lastIdx > i ? slots[lastIdx].end : category.end;
      removeCount = slots.length - i;
      break;
    }
  }

  // No destination set — we never landed at a Category, hard-stopped on a
  // Travel slot, or hard-stopped on a location-less Occupied. Fall back to a
  // pinned destination so we still place something with a coherent target.
  if (destination === null) {
    const fallback = nextPinnedLocation(slots, i + 1);
    if (!fallback) {
      recorder?.decision(M.bypassCategoryCascade.noPinnedDestination, 4);
      return fillCategoryTailOrTrespass(
        slots,
        i,
        action,
        travelManager,
        recorder,
      );
    }
    destination = fallback;
    T = travelManager.getTravelTime(A, destination, category.end);
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
    insufficient = consumed < T;
  }

  // Track the final destination once.
  travelManager.trackLeg(A, destination);

  // Shrink to natural, but not past the first absorbed Category — see
  // firstNonFreeAbsorbedStart for the rationale. In bypass the absorb starts
  // with the bypassed cat, so the snap boundary is typically category.start
  // and the travel naturally lands there (no head leftover at A).
  const absorbed = slots.slice(i, i + removeCount);
  const naturalTravelStart = new Date(travelEnd.getTime() - T * 60000);
  const safeShrinkBoundary = firstNonFreeAbsorbedStart(absorbed);
  let actualTravelStart: Date;
  let overconstrained = false;
  if (insufficient) {
    actualTravelStart = category.start;
  } else if (
    safeShrinkBoundary &&
    naturalTravelStart.getTime() > safeShrinkBoundary.getTime()
  ) {
    actualTravelStart = safeShrinkBoundary;
    overconstrained = true;
  } else {
    actualTravelStart =
      naturalTravelStart.getTime() > category.start.getTime()
        ? naturalTravelStart
        : category.start;
  }
  const canShrink =
    !insufficient && actualTravelStart.getTime() > category.start.getTime();

  const shardSources = collectShardSources(
    absorbed,
    actualTravelStart,
    travelEnd,
  );
  const shards = createTravelShards(
    shardSources,
    uuidv4(),
    A,
    destination,
    "preliminary",
    {
      insufficientTravel: insufficient,
      requiredTravelMinutes: insufficient || overconstrained ? T : 0,
      overconstrained: overconstrained || undefined,
    },
  );
  if (shards.length > 0) {
    shards[0].consumedCategoryIds = (
      shards[0].consumedCategoryIds ?? []
    ).concat(consumedCategoryIds);
  }

  const replacements: Slot[] = [];
  if (canShrink) {
    // Free time at A in the leading Available region — happens only if a
    // prev Available was part of the absorb. In the typical bypass shape
    // (absorb starts at the cat) this branch doesn't fire.
    replacements.push({
      type: "available",
      start: category.start,
      end: actualTravelStart,
      durationMinutes: Math.floor(
        (actualTravelStart.getTime() - category.start.getTime()) / 60000,
      ),
      prevLocationId: A,
      nextLocationId: A,
    });
  }
  replacements.push(...shards);
  if (fit.kind === "naturalFit" && partialSplitTime) {
    replacements.push(
      buildLandingSurvivor(fit.slot, partialSplitTime, destination),
    );
  }

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
  // Walker lands on the slot AFTER the shards — the partial's exit edge
  // (if any) or the preserved slot (endAtSlotStart / hardStop).
  return i + (canShrink ? 1 : 0) + shards.length;
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
      categories,
      recorder,
      (labels) => M.backwardBypassCascade.travelAbsorbAction(labels),
    );
  }

  // fit.kind === "category"
  return applyCategoryAnchorPlacement(
    slots,
    i,
    fit,
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
  categories: Category[],
  recorder: TravelPassRecorder | undefined,
  actionMessage: (absorbedLabels: string[]) => string,
): number {
  const { anchorIdx, anchor, A, TDirect, precedingAvailableIdx } = fit;
  // When precedingAvailableIdx is set, the absorb extends one slot earlier:
  // the Available's tail [regionStart, Available.end] is consumed by the
  // travel; the head [Available.start, regionStart] survives as a shortened
  // Available.
  const absorbStartIdx = precedingAvailableIdx ?? anchorIdx;
  const precedingAvailable =
    precedingAvailableIdx !== undefined
      ? (slots[precedingAvailableIdx] as AvailableSlot)
      : null;

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

  // Place the natural-sized travel at the tail of the absorbed region, but
  // snap the start back to a boundary that doesn't punch a Cat/sentinel
  // interior — head restoration is atomic-per-Cat (no partial Cat fragments).
  const naturalTravelStart = new Date(regionEnd.getTime() - TDirect * 60000);

  // Recover the original-fabric boundary if the slot just before the
  // absorb is a bleed-trimmed Category. Independent of the head-restore
  // logic — this touches a slot OUTSIDE the absorb region.
  const bleedTrimmedPrevCat =
    !precedingAvailable && absorbStartIdx > 0
      ? detectBleedTrimmedCat(slots[absorbStartIdx - 1], categories)
      : null;
  // If a bleed-trimmed prev cat sits right before the absorb, restoring it
  // to its wrapper end consumes the early head of the absorb region. The
  // new travel can't start before that wrapper boundary.
  const earliestTravelStart = bleedTrimmedPrevCat
    ? bleedTrimmedPrevCat.wrapperEnd
    : slots[absorbStartIdx].start;

  const removeCount = i - absorbStartIdx + 1;
  const absorbed = slots.slice(absorbStartIdx, absorbStartIdx + removeCount);

  // Latest absorb-region boundary ≤ natural where head restoration only
  // crosses Available-like spans. Falls back to absorbStart if natural is
  // before the absorb, or to the slot.start of the Cat-like interior natural
  // lands in (consume the whole Cat/sentinel rather than partial-restore).
  const safeHeadBoundary =
    latestSafeHeadRestoreBoundary(absorbed, naturalTravelStart) ??
    slots[absorbStartIdx].start;
  const travelStart =
    safeHeadBoundary.getTime() < earliestTravelStart.getTime()
      ? earliestTravelStart
      : safeHeadBoundary;
  // Overconstrained when the snap or the bleed-trimmed cat forced the
  // travel to start earlier than its natural T-derived position.
  const overconstrained =
    travelStart.getTime() < naturalTravelStart.getTime();

  // Collect consumedCategoryIds: only absorbed Cats / sentinels whose time
  // region falls inside the travel span [travelStart, regionEnd]. Slots whose
  // region sits in the head-restored zone [absorbStart, travelStart) keep
  // their original character via head restoration (or via bleedTrimmedPrevCat
  // wrapper restoration) — those Cats survive as live slots and must NOT be
  // double-counted as consumed.
  //
  // For Travel-shard absorbed slots: pull both the shard's own consumed list
  // (sentinel case) AND its originalCategoryId (Cat-fragment case). Deduped
  // because a bled Cat can leave multiple fragments that all carry the same
  // originalCategoryId.
  const travelStartMs = travelStart.getTime();
  const consumedSet = new Set<string>();
  if (
    anchor.consumedCategoryIds &&
    anchor.start.getTime() >= travelStartMs
  ) {
    for (const id of anchor.consumedCategoryIds) consumedSet.add(id);
  }
  for (let k = anchorIdx + 1; k <= i; k++) {
    const s = slots[k];
    if (s.start.getTime() < travelStartMs) continue;
    if (s.type === "category") {
      consumedSet.add(s.categoryId);
    } else if (s.type === "travel") {
      if (s.consumedCategoryIds) {
        for (const id of s.consumedCategoryIds) consumedSet.add(id);
      }
      if (s.originalType === "category" && s.originalCategoryId) {
        consumedSet.add(s.originalCategoryId);
      }
    }
  }
  const consumedCategoryIds = [...consumedSet];
  const shardSources = collectShardSources(absorbed, travelStart, regionEnd);
  const shards = createTravelShards(
    shardSources,
    uuidv4(),
    A,
    destination,
    "preliminary",
    overconstrained
      ? { overconstrained: true, requiredTravelMinutes: TDirect }
      : undefined,
  );
  if (shards.length > 0) {
    shards[0].consumedCategoryIds = (
      shards[0].consumedCategoryIds ?? []
    ).concat(consumedCategoryIds);
  }

  // Restore the head [absorbedStart, travelStart] from the absorbed slots'
  // original characters. When a bleed-trimmed prev Category is being restored
  // to its wrapper end, that prev cat already covers [absorbedStart,
  // wrapperEnd]; the head restoration must start at wrapperEnd to avoid
  // duplicating that region (the absorbed leading shards would otherwise
  // restore back to the same Category fragment the prev cat now owns).
  const headRestoreStart = bleedTrimmedPrevCat
    ? bleedTrimmedPrevCat.wrapperEnd
    : slots[absorbStartIdx].start;
  const headFragments = restoreAbsorbedRange(
    absorbed,
    headRestoreStart,
    travelStart,
  );
  if (headFragments.length > 0) {
    const last = headFragments[headFragments.length - 1];
    if (last.type === "available") last.nextLocationId = A;
  }

  const replacements: Slot[] = [...headFragments, ...shards];

  if (bleedTrimmedPrevCat) restoreBleedTrimmedCat(bleedTrimmedPrevCat);

  slots.splice(absorbStartIdx, removeCount, ...replacements);
  if (recorder) {
    recorder.action(actionMessage(absorbed.map((s) => recorder.label(s))));
  }
  return absorbStartIdx + replacements.length;
}

function applyCategoryAnchorPlacement(
  slots: Slot[],
  i: number,
  fit: Extract<CascadeAnchorFit, { kind: "category" }>,
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

  // Always place the natural-sized travel at the head of the absorbed
  // region. Any leftover at the tail gets restored from each absorbed
  // slot's original character. The shard model exists for this — the
  // absorb isn't free to invent wasted travel time.
  const actualTravelEnd = new Date(slotStart.getTime() + T * 60000);

  const removeCount = i - anchorIdx;
  const absorbed = slots.slice(anchorIdx + 1, anchorIdx + 1 + removeCount);
  const shardSources = collectShardSources(
    absorbed,
    slotStart,
    actualTravelEnd,
  );
  const shards = createTravelShards(
    shardSources,
    uuidv4(),
    anchorLocation,
    destination,
    "preliminary",
    { requiredTravelMinutes: T },
  );
  if (shards.length > 0) {
    shards[0].consumedCategoryIds = (
      shards[0].consumedCategoryIds ?? []
    ).concat(consumedCategoryIds);
  }

  // Restore the tail [actualTravelEnd, regionEnd] from absorbed slots'
  // original characters. The first restored fragment's "prev" is rewired
  // to destination so the boundary with the new Travel makes sense.
  const tailFragments = restoreAbsorbedRange(
    absorbed,
    actualTravelEnd,
    regionEnd,
  );
  if (tailFragments.length > 0) {
    const first = tailFragments[0];
    if (first.type === "available") {
      first.prevLocationId = destination;
      // Preserve the caller's hint for what follows the cascade region.
      const last = tailFragments[tailFragments.length - 1];
      if (last.type === "available") last.nextLocationId = tailNextLocation;
    }
  }

  const replacements: Slot[] = [...shards, ...tailFragments];

  slots.splice(anchorIdx + 1, removeCount, ...replacements);
  if (recorder) {
    recorder.action(
      actionMessage(
        absorbed.map((s) => recorder.label(s)),
        false,
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
  // Two source pieces: the neighbor (fully consumed) and the current Available.
  const sources: ShardSource[] =
    side === "prev"
      ? [
          neighbor.type === "available"
            ? shardSourceFromAvailable(neighbor, travelStart, neighbor.end)
            : shardSourceFromCategory(neighbor, travelStart, neighbor.end),
          shardSourceFromAvailable(slot, slot.start, slot.end),
        ]
      : [
          shardSourceFromAvailable(slot, slot.start, slot.end),
          neighbor.type === "available"
            ? shardSourceFromAvailable(neighbor, neighbor.start, travelEnd)
            : shardSourceFromCategory(neighbor, neighbor.start, travelEnd),
        ];

  const shards = createTravelShards(
    sources,
    uuidv4(),
    prevLocation,
    nextLocation,
    "preliminary",
    { insufficientTravel: true, requiredTravelMinutes: travelMinutes },
  );
  if (side === "prev") {
    return spliceBleedPrev(
      slots,
      i,
      neighborIdx,
      neighbor,
      shards,
      true,
      travelStart,
    );
  }
  return spliceBleedNext(
    slots,
    i,
    neighborIdx,
    neighbor,
    shards,
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
  travelManager.untrackLeg(action.prevLocation, action.nextLocation);

  recorder?.decision(M.forwardBypassCascade.header, 5);

  const fit = walkForwardForFit({
    slots,
    startIdx: i,
    referenceStartTime: current.start,
    initialConsumedCategoryIds: [],
    availableCandidateMode: "always-next",
    travelManager,
    origin: A,
    referenceTime: () => current.end,
    hardStopReferenceTime: current.end,
  });

  let destination = action.nextLocation;
  let T = action.travelMinutes;
  let travelEnd: Date;
  let insufficient = false;
  const consumed = fit.consumed;
  const consumedCategoryIds = [...fit.consumedCategoryIds];
  let partialSplitTime: Date | null = null;
  let removeCount: number;

  switch (fit.kind) {
    case "naturalFit": {
      destination = fit.destination;
      T = fit.T;
      travelEnd = fit.travelEnd;
      partialSplitTime = fit.travelEnd;
      if (
        fit.slot.type === "category" &&
        travelEnd.getTime() > fit.slot.start.getTime()
      ) {
        consumedCategoryIds.push(fit.slot.categoryId);
      } else if (
        fit.slot.type === "travel" &&
        fit.slot.consumedCategoryIds &&
        travelEnd.getTime() > fit.slot.start.getTime()
      ) {
        consumedCategoryIds.push(...fit.slot.consumedCategoryIds);
      }
      // Eat slots [i, fit.idx]; the landing slot survives via buildLandingSurvivor.
      removeCount = fit.idx - i + 1;
      recorder?.decision(
        M.forwardBypassCascade.partialSplit(fit.idx, fit.remaining),
        7,
      );
      break;
    }
    case "preFit": {
      destination = fit.destination;
      T = fit.T;
      travelEnd = fit.slot.start;
      // Slot at fit.idx is preserved intact; eat slots [i, fit.idx).
      removeCount = fit.idx - i;
      recorder?.decision(
        M.forwardBypassCascade.endAtSlotStart(T, consumed, fit.idx),
        7,
      );
      break;
    }
    case "hardStop": {
      if (recorder) {
        recorder.decision(
          M.forwardBypassCascade.anchorHardStop(
            fit.idx,
            recorder.label(fit.hardStopSlot),
          ),
          6,
        );
      }
      if (fit.pinnedDestination) {
        destination = fit.pinnedDestination;
        T = fit.pinnedT;
        recorder?.decision(M.forwardBypassCascade.retargetOccupied(T), 7);
      }
      travelEnd = fit.hardStopSlot.start;
      insufficient = consumed < T;
      // Hard-stop slot is preserved; eat slots [i, fit.idx).
      removeCount = fit.idx - i;
      break;
    }
    case "exhausted": {
      const lastIdx = slots.length - 1;
      travelEnd = lastIdx > i ? slots[lastIdx].end : current.end;
      insufficient = consumed < T;
      removeCount = slots.length - i;
      break;
    }
  }

  // Track the final chosen leg before placement.
  travelManager.trackLeg(A, destination);

  // Shrink-to-natural is only safe within the leading run of Available-like
  // slots at the absorb's head — the user's "free time at A" before any cat
  // begins. If naturalStart lands inside a Category-typed slot (a real Cat
  // or a zero-distance sentinel), snap the travel start to that slot's
  // start so the head leftover doesn't masquerade as "at A" during the
  // cat's time. The resulting slot is bigger than natural T → overconstrained.
  const absorbed = slots.slice(i, i + removeCount);
  const naturalTravelStart = new Date(travelEnd.getTime() - T * 60000);
  const safeShrinkBoundary = firstNonFreeAbsorbedStart(absorbed);
  let actualTravelStart: Date;
  let overconstrained = false;
  if (insufficient) {
    actualTravelStart = current.start;
  } else if (
    safeShrinkBoundary &&
    naturalTravelStart.getTime() > safeShrinkBoundary.getTime()
  ) {
    actualTravelStart = safeShrinkBoundary;
    overconstrained = true;
  } else {
    actualTravelStart = naturalTravelStart;
  }
  const canShrink =
    !insufficient && actualTravelStart.getTime() > current.start.getTime();

  const shardSources = collectShardSources(
    absorbed,
    actualTravelStart,
    travelEnd,
  );
  const shards = createTravelShards(
    shardSources,
    uuidv4(),
    A,
    destination,
    "preliminary",
    {
      insufficientTravel: insufficient,
      requiredTravelMinutes: insufficient || overconstrained ? T : 0,
      overconstrained: overconstrained || undefined,
    },
  );
  if (shards.length > 0) {
    shards[0].consumedCategoryIds = (
      shards[0].consumedCategoryIds ?? []
    ).concat(consumedCategoryIds);
  }

  const replacements: Slot[] = [];
  if (canShrink) {
    replacements.push({
      type: "available",
      start: current.start,
      end: actualTravelStart,
      durationMinutes: Math.floor(
        (actualTravelStart.getTime() - current.start.getTime()) / 60000,
      ),
      prevLocationId: A,
      nextLocationId: A,
    });
  }
  replacements.push(...shards);
  if (fit.kind === "naturalFit" && partialSplitTime) {
    replacements.push(
      buildLandingSurvivor(fit.slot, partialSplitTime, destination),
    );
  }

  slots.splice(i, removeCount, ...replacements);
  if (recorder) {
    recorder.action(
      M.forwardBypassCascade.action(
        absorbed.map((s) => recorder.label(s)),
        insufficient,
        false,
      ),
    );
  }
  // Walker lands on the slot AFTER the shards.
  return i + (canShrink ? 1 : 0) + shards.length;
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

  // Two source pieces: current's tail and next's head.
  const shards = createTravelShards(
    [
      shardSourceFromCategory(current, travelStart, current.end),
      shardSourceFromCategory(next, next.start, travelEnd),
    ],
    uuidv4(),
    action.prevLocation,
    action.nextLocation,
    "preliminary",
  );

  const replacements: Slot[] = [];
  const firstShard = shards[0];
  const lastShard = shards[shards.length - 1];

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
    firstShard.consumedCategoryIds = (
      firstShard.consumedCategoryIds ?? []
    ).concat(current.categoryId);
  }

  const shardStartIdx = replacements.length;
  replacements.push(...shards);

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
    lastShard.consumedCategoryIds = (
      lastShard.consumedCategoryIds ?? []
    ).concat(next.categoryId);
  }

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
  // Walker lands on the first slot AFTER the shards — typically the
  // shortened-next category so its exit edge can fire on the next iteration.
  return i + shardStartIdx + shards.length;
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

// The cascade's "free time at A" head leftover can extend through Available
// slots (and Travel shards carved out of Available sources) at the absorb's
// head, but NOT into a real Category or a zero-distance sentinel — both
// represent the user being scheduled at a non-A location, so a head leftover
// landing inside them would falsely imply "at A during cat time." Returns
// the start of the first such slot in absorbed, or null if the whole absorb
// is free-time-like (no clamp needed).
function firstNonFreeAbsorbedStart(absorbed: Slot[]): Date | null {
  for (const slot of absorbed) {
    if (slot.type === "available") continue;
    if (slot.type === "travel" && slot.originalType === "available") continue;
    return slot.start;
  }
  return null;
}

function isAvailableLike(slot: Slot): boolean {
  if (slot.type === "available") return true;
  if (slot.type === "travel" && slot.originalType === "available") return true;
  return false;
}

// Logical category identity of a slot. Live Cats return their categoryId;
// Travel shards from a Category source return the original categoryId from
// their shard metadata. Returns null for anything else. Used to coalesce
// fragments of the same original Cat (e.g. a Cat that got bled at both edges
// leaves three pieces — leading shard, surviving middle Cat slot, trailing
// shard — all carrying the same categoryId) so the safe-boundary scanner
// treats them as one continuous original Cat rather than three separate slots.
function logicalCategoryId(slot: Slot): string | null {
  if (slot.type === "category") return slot.categoryId;
  if (
    slot.type === "travel" &&
    slot.originalType === "category" &&
    slot.originalCategoryId
  ) {
    return slot.originalCategoryId;
  }
  return null;
}

// Coalesce contiguous absorbed slots that belong to the same original logical
// slot. Two slots merge when they're touching in time and share both Available-
// like-ness AND categoryId (for Cats). This restores the pre-bleed fabric view
// so the safe-boundary scanner sees the original Cat span, not the split
// fragments that earlier passes carved out.
type LogicalChunk = {
  start: Date;
  end: Date;
  isAvailable: boolean;
  catId: string | null;
};

function coalesceAbsorbed(absorbed: Slot[]): LogicalChunk[] {
  const chunks: LogicalChunk[] = [];
  for (const slot of absorbed) {
    const isAvail = isAvailableLike(slot);
    const catId = logicalCategoryId(slot);
    const last = chunks[chunks.length - 1];
    if (
      last &&
      last.end.getTime() === slot.start.getTime() &&
      last.isAvailable === isAvail &&
      last.catId === catId
    ) {
      last.end = slot.end;
    } else {
      chunks.push({
        start: slot.start,
        end: slot.end,
        isAvailable: isAvail,
        catId,
      });
    }
  }
  return chunks;
}

// Backward-cascade head-restoration safety rule. The natural travel start is
// `regionEnd - T`. If that point lands strictly inside a Cat (or chain of
// fragments belonging to the same original Cat), head restoration would carve
// a partial-Cat fragment — invalid, because original Cats are atomic in
// restoration. Returns the latest original-fabric boundary ≤ natural.
//
// Boundaries within Available-like spans are all safe (Available can be
// partial-split). Boundaries WITHIN a Cat are forbidden — only the Cat's
// logical start and end count. The coalescing step reconstructs the original
// Cat span from any bled fragments so the scanner doesn't mistakenly treat a
// fragment seam (e.g. 11:04 in a [11:00-12:00] Cat that was bled at 11:04)
// as an original-fabric boundary.
function latestSafeHeadRestoreBoundary(
  absorbed: Slot[],
  natural: Date,
): Date | null {
  if (absorbed.length === 0) return null;
  const chunks = coalesceAbsorbed(absorbed);
  const naturalMs = natural.getTime();
  const absorbStartMs = chunks[0].start.getTime();
  if (naturalMs <= absorbStartMs) return chunks[0].start;

  let latestMs = absorbStartMs;
  for (const chunk of chunks) {
    const startMs = chunk.start.getTime();
    const endMs = chunk.end.getTime();
    if (startMs > naturalMs) break;
    latestMs = Math.max(latestMs, startMs);
    if (chunk.isAvailable) {
      const cap = Math.min(endMs, naturalMs);
      latestMs = Math.max(latestMs, cap);
    } else if (endMs <= naturalMs) {
      latestMs = Math.max(latestMs, endMs);
    } else {
      break;
    }
  }
  return new Date(latestMs);
}

// Returns the surviving "tail" slot after a cascade's natural-fit travel
// lands inside `landingSlot` at `splitTime`. For Available/Category landing
// slots, that's a shortened-at-start version of the original. For a zero-
// distance Travel sentinel landing, the sentinel's consumed cats have
// already been transferred to the new travel above, so the leftover is
// simply free time at the destination (the user is at destination from
// splitTime until the sentinel's original end).
function buildLandingSurvivor(
  landingSlot: AvailableSlot | CategorySlot | TravelSlot,
  splitTime: Date,
  destinationLocation: string,
): AvailableSlot | CategorySlot {
  if (landingSlot.type === "travel") {
    return {
      type: "available",
      start: splitTime,
      end: landingSlot.end,
      durationMinutes: Math.floor(
        (landingSlot.end.getTime() - splitTime.getTime()) / 60000,
      ),
      prevLocationId: destinationLocation,
      nextLocationId: destinationLocation,
    };
  }
  return shortenPlaceableAtStart(landingSlot, splitTime, destinationLocation);
}
