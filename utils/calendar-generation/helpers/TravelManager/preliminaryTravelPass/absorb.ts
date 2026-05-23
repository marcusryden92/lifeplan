import { Category } from "@/types/prisma";
import {
  AvailableSlot,
  CategorySlot,
  OccupiedSlot,
  Slot,
} from "../../../models/TimeSlot";
import { TravelManager } from "../../../core/TravelManager";
import { TravelProcessingAction } from "../../../models/SchedulingModels";
import {
  collectShardSources,
  createTravelShards,
} from "../../../utils/timeSlotUtils";
import { TravelPassRecorder } from "../TravelPassRecorder";
import { M } from "../travelPassMessages";
import {
  detectBleedRecovery,
  walkBackwardForFit,
  walkForwardForFit,
} from "../travelPassUtils";
import { bleedAcrossCategoryBoundary } from "./bleed";
import { applyBackwardCascadeFit } from "./cascade";
import { latestSafeBoundary } from "./fabric";
import { PrevTravelMatch } from "./lookups";
import {
  fillCategoryTailOrTrespass,
  fillCurrentWithAlert,
} from "./placement";
import {
  buildLandingSurvivor,
  shortenPlaceableAtStart,
} from "./slotShape";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Action: Available with Prev=Travel — absorb prev Travel + leftover Available
// into one A->C region and re-place a fresh travel at the region's tail. Used
// for both next=Available/Category and next=Occupied — the splice geometry
// only touches [prevAvailable?, prevTravel, ..., current], so next is left
// for the walker's next iteration regardless of its type.
// ---------------------------------------------------------------------------

export function absorbAndReplan(
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

export function absorbAndReplanThroughCategory(
  slots: Slot[],
  i: number,
  originalAction: TravelProcessingAction,
  _prevTravel: PrevTravelMatch,
  travelManager: TravelManager,
  categories: Category[],
  recorder?: TravelPassRecorder,
): number {
  // Undo the resolveCategoryEdge-tracked leg (B -> C). Absorbed travel legs
  // (including the prev Travel) get untracked by applyBackwardCascadeFit when
  // the walker decides which slots to absorb. If the walker can't find a fit,
  // we re-track this leg in the fallback.
  travelManager.untrackLeg(
    originalAction.prevLocation,
    originalAction.nextLocation,
  );

  const category = slots[i] as CategorySlot;
  const C = originalAction.nextLocation;

  recorder?.decision(M.absorbAndReplanThroughCategoryCascade.header, 3);

  const fit = walkBackwardForFit({
    slots,
    walkStartIdx: i,
    regionEnd: category.end,
    destination: C,
    travelManager,
    referenceTime: category.end,
  });

  if (fit.kind === "hardStop" || fit.kind === "exhausted") {
    recorder?.decision(M.absorbAndReplanThroughCategoryCascade.noAnchorFits, 4);
    travelManager.trackLeg(
      originalAction.prevLocation,
      originalAction.nextLocation,
    );
    return fillCategoryTailOrTrespass(
      slots,
      i,
      originalAction,
      travelManager,
      recorder,
    );
  }

  return applyBackwardCascadeFit({
    slots,
    walkStartIdx: i,
    fit,
    regionEnd: category.end,
    destination: C,
    travelManager,
    categories,
    recorder,
    actionMessage: (labels, overconstrained) =>
      M.absorbAndReplanThroughCategoryCascade.categoryAnchorAction(
        labels,
        overconstrained,
      ),
  });
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

export function absorbAndReplanIntoNextCategory(
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
  const defaultBaseStart = prevAvailable?.start ?? prevTravel.travel.start;
  const bleed = detectBleedRecovery(
    !prevAvailable && firstIdx > 0 ? slots[firstIdx - 1] : undefined,
    categories,
    defaultBaseStart,
  );
  const baseRegionStart = bleed.floor;

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

  // Shrink to natural, but don't shrink past an absorbed Cat/sentinel
  // interior — see latestSafeBoundary. Any head leftover stays within
  // Available-like runs at the absorb's head. Cats and sentinels in the
  // absorb get fully covered by the new travel.
  const absorbed = slots.slice(firstIdx, firstIdx + removeCount);
  const naturalTravelStart = new Date(travelEnd.getTime() - T * 60000);
  const safeBoundary = latestSafeBoundary(absorbed, naturalTravelStart);
  let actualTravelStart: Date;
  let overconstrained = false;
  if (insufficient) {
    actualTravelStart = baseRegionStart;
  } else if (
    safeBoundary &&
    safeBoundary.getTime() < naturalTravelStart.getTime()
  ) {
    actualTravelStart = safeBoundary;
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

  bleed.restore();

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

export function absorbAndReplanBackward(
  slots: Slot[],
  catIdx: number,
  occupiedIdx: number,
  originalAction: TravelProcessingAction,
  travelManager: TravelManager,
  categories: Category[],
  recorder?: TravelPassRecorder,
): number | null {
  const occupied = slots[occupiedIdx] as OccupiedSlot;
  if (!occupied.locationId) return null;

  const destination = occupied.locationId;
  const regionEnd = occupied.start;

  recorder?.decision(M.absorbAndReplanBackward.header, 2);

  // Walk from cat2 (= slots[catIdx + 1]) backward looking for an anchor. The
  // walker overflows cat2 first (origin = cat2.loc != destination), then
  // cat1, then earlier slots until it finds a fit or hits a hard stop.
  const fit = walkBackwardForFit({
    slots,
    walkStartIdx: catIdx + 1,
    regionEnd,
    destination,
    travelManager,
    referenceTime: regionEnd,
  });

  if (fit.kind === "hardStop" || fit.kind === "exhausted") {
    return null;
  }

  // Untrack the cat1 -> cat2 leg before placement. applyBackwardCascadeFit
  // untracks any absorbed travels and tracks the new leg.
  travelManager.untrackLeg(
    originalAction.prevLocation,
    originalAction.nextLocation,
  );

  if (recorder) {
    recorder.decision(
      M.absorbAndReplanBackward.committed(
        fit.idx,
        recorder.label(fit.slot),
        fit.origin,
        fit.T,
        fit.kind === "naturalFit" ? "natural" : "preFit",
      ),
      3,
    );
  }

  return applyBackwardCascadeFit({
    slots,
    walkStartIdx: catIdx + 1,
    fit,
    regionEnd,
    destination,
    travelManager,
    categories,
    recorder,
    actionMessage: (labels, overconstrained) =>
      M.absorbAndReplanBackward.action(
        labels,
        fit.kind === "naturalFit",
        overconstrained,
      ),
  });
}
