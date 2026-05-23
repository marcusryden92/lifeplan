import { Category } from "@/types/prisma";
import {
  AvailableSlot,
  CategorySlot,
  Slot,
  TravelSlot,
} from "../../../models/TimeSlot";
import { TravelManager } from "../../../core/TravelManager";
import { TravelProcessingAction } from "../../../models/SchedulingModels";
import {
  collectShardSources,
  createTravelShards,
  shardSourceFromAvailable,
  shardSourceFromCategory,
  type ShardSource,
} from "../../../utils/timeSlotUtils";
import { TravelPassRecorder } from "../TravelPassRecorder";
import { M } from "../travelPassMessages";
import {
  BackwardFitResult,
  detectBleedRecovery,
  walkBackwardForFit,
  walkForwardForFit,
} from "../travelPassUtils";
import { latestSafeBoundary } from "./fabric";
import { nextPinnedLocation } from "./lookups";
import {
  fillCategoryTailOrTrespass,
  fillCurrentWithAlert,
} from "./placement";
import {
  buildLandingSurvivor,
  shortenPlaceableAtEnd,
  spliceBleedNext,
  spliceBleedPrev,
} from "./slotShape";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Action: Category entry, Prev=Occupied, doesn't fit — bypass cascade
// ---------------------------------------------------------------------------

export function bypassCategoryCascade(
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

  // Shrink to natural, but not past an absorbed Cat/sentinel interior —
  // see latestSafeBoundary. In bypass the absorb starts with the bypassed
  // cat, so the snap boundary is typically category.start and the travel
  // naturally lands there (no head leftover at A).
  const absorbed = slots.slice(i, i + removeCount);
  const naturalTravelStart = new Date(travelEnd.getTime() - T * 60000);
  const safeBoundary = latestSafeBoundary(absorbed, naturalTravelStart);
  let actualTravelStart: Date;
  let overconstrained = false;
  if (insufficient) {
    actualTravelStart = category.start;
  } else if (
    safeBoundary &&
    safeBoundary.getTime() < naturalTravelStart.getTime()
  ) {
    actualTravelStart = safeBoundary;
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

// ---------------------------------------------------------------------------
// Action: Available with next=Occupied — backward bypass cascade.
//
// Uses walkBackwardForFit to find the latest legal travel start. The walker
// returns one of preFit / naturalFit / overconstrained (success) or
// hardStop / exhausted (no anchor — fall back to the insufficient bleed).
// ---------------------------------------------------------------------------

export function backwardBypassCascade(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  travelManager: TravelManager,
  categories: Category[],
  recorder?: TravelPassRecorder,
): number {
  const current = slots[i] as AvailableSlot;
  const destination = action.nextLocation;
  const regionEnd = current.end;

  // Untrack the original leg up front. If the walker can't find an anchor,
  // we re-track it in the fallback path.
  travelManager.untrackLeg(action.prevLocation, action.nextLocation);
  recorder?.decision(M.backwardBypassCascade.header, 5);

  const fit = walkBackwardForFit({
    slots,
    walkStartIdx: i,
    regionEnd,
    destination,
    travelManager,
    referenceTime: regionEnd,
  });

  if (fit.kind === "hardStop" || fit.kind === "exhausted") {
    recorder?.decision(M.backwardBypassCascade.noAnchorFits, 6);
    travelManager.trackLeg(action.prevLocation, action.nextLocation);
    const result = bleedSingleSideInsufficient(slots, i, action, "prev");
    recorder?.action(M.backwardBypassCascade.fallbackPrevAction);
    return result;
  }

  return applyBackwardCascadeFit({
    slots,
    walkStartIdx: i,
    fit,
    regionEnd,
    destination,
    travelManager,
    categories,
    recorder,
    actionMessage: (labels, overconstrained) =>
      M.backwardBypassCascade.action(labels, overconstrained),
  });
}

// ---------------------------------------------------------------------------
// Backward cascade placement — shared by backwardBypassCascade,
// absorbAndReplanThroughCategory's cascade branch, and absorbAndReplanBackward.
//
// Given a walker fit (preFit / naturalFit / overconstrained), splice the new
// travel into the slots array. The placement geometry is fully determined by
// the walker's output — no post-hoc snap or atomicity check needed.
//
//   - preFit: anchor preserved, travel = [anchor.end, regionEnd]. If the
//     slot ends up bigger than T (because consumed > T), mark overconstrained.
//   - naturalFit: anchor partial-eaten — head [anchor.start, travelStart]
//     survives as a shortened version of the anchor. Travel = [travelStart,
//     regionEnd].
//   - overconstrained: anchor wholly absorbed, travel = [anchor.start,
//     regionEnd]. Slot is bigger than T.
//
// The slot just before the absorb is checked for a bleed-trimmed Cat (its
// end was clipped by an earlier bleed). If present, the cat's wrapper end is
// restored to the original-fabric boundary; the new travel can't begin
// before that wrapper end.
// ---------------------------------------------------------------------------

export function applyBackwardCascadeFit(args: {
  slots: Slot[];
  walkStartIdx: number;
  fit: Extract<
    BackwardFitResult,
    { kind: "preFit" | "naturalFit" | "overconstrained" }
  >;
  regionEnd: Date;
  destination: string;
  travelManager: TravelManager;
  categories: Category[];
  recorder: TravelPassRecorder | undefined;
  actionMessage: (absorbedLabels: string[], overconstrained: boolean) => string;
}): number {
  const {
    slots,
    walkStartIdx,
    fit,
    regionEnd,
    destination,
    travelManager,
    categories,
    recorder,
  } = args;

  // PreFit: anchor preserved. Absorb = (anchor+1 .. walkStartIdx).
  // NaturalFit / overconstrained: anchor absorbed. Absorb = (anchor .. walkStartIdx).
  const absorbStartIdx = fit.kind === "preFit" ? fit.idx + 1 : fit.idx;
  const removeCount = walkStartIdx - absorbStartIdx + 1;

  // Untrack absorbed travel legs.
  for (let k = absorbStartIdx; k <= walkStartIdx; k++) {
    const s = slots[k];
    if (
      s.type === "travel" &&
      s.travelFromLocationId &&
      s.travelToLocationId
    ) {
      travelManager.untrackLeg(s.travelFromLocationId, s.travelToLocationId);
    }
  }
  travelManager.trackLeg(fit.origin, destination);

  // Bleed-trimmed prev cat recovery. If the slot just before the absorb is
  // a Cat whose end was trimmed by an earlier bleed, restore its wrapper end.
  // The wrapper extension can push travelStart later than the walker chose,
  // adding to overconstrained slack.
  const bleed = detectBleedRecovery(
    absorbStartIdx > 0 ? slots[absorbStartIdx - 1] : undefined,
    categories,
    slots[absorbStartIdx].start,
  );

  let travelStart = fit.travelStart;
  let overconstrained = fit.kind === "overconstrained";
  if (travelStart.getTime() < bleed.floor.getTime()) {
    travelStart = bleed.floor;
    overconstrained = true;
  }

  // Build partial survivor for naturalFit. The anchor's head [anchor.start,
  // travelStart] becomes a shortened version of the anchor with next=origin.
  // If bleed recovery pushed travelStart past the anchor's start, the head
  // may be empty (or wholly inside the bleed wrapper) — no survivor.
  const leadingReplacements: Slot[] = [];
  if (
    fit.kind === "naturalFit" &&
    fit.slot.start.getTime() < travelStart.getTime() &&
    bleed.floor.getTime() <= fit.slot.start.getTime()
  ) {
    const anchor = fit.slot;
    if (anchor.type === "category" || anchor.type === "available") {
      leadingReplacements.push(
        shortenPlaceableAtEnd(anchor, travelStart, fit.origin),
      );
    }
    // NaturalFit at a Travel anchor is impossible — Travel spans are atomic
    // per the walker's classification, so they would have returned
    // overconstrained instead.
  }

  const absorbed = slots.slice(absorbStartIdx, absorbStartIdx + removeCount);
  const shardSources = collectShardSources(absorbed, travelStart, regionEnd);
  const shards = createTravelShards(
    shardSources,
    uuidv4(),
    fit.origin,
    destination,
    "preliminary",
    overconstrained
      ? { overconstrained: true, requiredTravelMinutes: fit.T }
      : undefined,
  );
  if (shards.length > 0) {
    shards[0].consumedCategoryIds = (
      shards[0].consumedCategoryIds ?? []
    ).concat(fit.consumedCategoryIds);
  }

  const replacements: Slot[] = [...leadingReplacements, ...shards];

  bleed.restore();

  slots.splice(absorbStartIdx, removeCount, ...replacements);

  if (recorder) {
    recorder.action(
      args.actionMessage(
        absorbed.map((s) => recorder.label(s)),
        overconstrained,
      ),
    );
  }

  return absorbStartIdx + replacements.length;
}

// ---------------------------------------------------------------------------
// Restore the original leg in the tracker (untracked at the top of
// backwardBypassCascade) and place a localized insufficient travel that
// only touches [current, immediate prev]. Called from every cascade exit
// that doesn't place a new A->C travel — single place to keep the
// untrack/retrack ledger balanced.
// ---------------------------------------------------------------------------

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

export function forwardBypassCascade(
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

  // Shrink-to-natural is only safe within Available-like spans of the
  // absorb. If naturalStart lands inside a Cat (real or zero-distance
  // sentinel), snap to the latest safe original-fabric boundary so the
  // head leftover doesn't masquerade as "at A" during cat time. The
  // resulting slot is bigger than natural T → overconstrained.
  const absorbed = slots.slice(i, i + removeCount);
  const naturalTravelStart = new Date(travelEnd.getTime() - T * 60000);
  const safeBoundary = latestSafeBoundary(absorbed, naturalTravelStart);
  let actualTravelStart: Date;
  let overconstrained = false;
  if (insufficient) {
    actualTravelStart = current.start;
  } else if (
    safeBoundary &&
    safeBoundary.getTime() < naturalTravelStart.getTime()
  ) {
    actualTravelStart = safeBoundary;
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
