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

  const consumedCategoryIds = [...fit.consumedCategoryIds];
  let destination: string | null = null;
  let T = 0;
  let boundary: Date;
  let removeCount: number;

  switch (fit.kind) {
    case "naturalFit": {
      destination = fit.destination;
      T = fit.T;
      boundary = fit.travelEnd;
      if (
        fit.slot.type === "category" &&
        boundary.getTime() > fit.slot.start.getTime()
      ) {
        consumedCategoryIds.push(fit.slot.categoryId);
      } else if (
        fit.slot.type === "travel" &&
        fit.slot.consumedCategoryIds &&
        boundary.getTime() > fit.slot.start.getTime()
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
      boundary = fit.slot.start;
      removeCount = fit.idx - i;
      recorder?.decision(
        M.bypassCategoryCascade.endAtSlotStart(T, fit.consumed, fit.idx),
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
      boundary = fit.hardStopSlot.start;
      removeCount = fit.idx - i;
      break;
    }
    case "exhausted": {
      const lastIdx = slots.length - 1;
      boundary = lastIdx > i ? slots[lastIdx].end : category.end;
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
  }

  // Track the final destination once.
  travelManager.trackLeg(A, destination);

  // Rigorous geometry. The travel fills the entire absorbed region as one
  // atomic transit. The user is in transit from absorb.start (= the moment
  // they left A — typically end-of-Occupied) until they arrive at the
  // boundary the walker chose. The slot's `requiredTravelMinutes` records
  // the actual travel time T; the slot duration may be longer
  // (overconstrained) or shorter (insufficient) than T.
  //
  //   travel.start = category.start                 (= absorb-region start)
  //   travel.end   = boundary                       (= region end)
  //
  //   overconstrained when slot.dur > T  (region wider than the trip)
  //   insufficient    when slot.dur < T  (hardStop / exhausted only —
  //                                        preFit/naturalFit guarantee
  //                                        slot.dur >= T)
  //
  // For naturalFit specifically the walker landed inside the boundary
  // slot's interior, so boundary = fit.travelEnd and slot.dur == T exactly
  // (no overconstrained). The slot's surviving tail
  // [boundary, fit.slot.end] is restored as the landing-slot survivor.
  const travelStart = category.start;
  const travelEnd = boundary;
  const slotDurMs = travelEnd.getTime() - travelStart.getTime();
  const naturalDurMs = T * 60000;
  const insufficient = slotDurMs < naturalDurMs;
  const overconstrained = slotDurMs > naturalDurMs;

  const absorbed = slots.slice(i, i + removeCount);
  const shardSources = collectShardSources(absorbed, travelStart, travelEnd);
  const shards = createTravelShards(
    shardSources,
    uuidv4(),
    A,
    destination,
    "preliminary",
    insufficient || overconstrained
      ? {
          insufficientTravel: insufficient,
          requiredTravelMinutes: T,
          overconstrained: overconstrained || undefined,
        }
      : undefined,
  );
  if (shards.length > 0) {
    shards[0].consumedCategoryIds = (
      shards[0].consumedCategoryIds ?? []
    ).concat(consumedCategoryIds);
  }

  const replacements: Slot[] = [...shards];

  if (fit.kind === "naturalFit") {
    replacements.push(
      buildLandingSurvivor(fit.slot, travelEnd, destination),
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
  // For naturalFit, land on the landing-slot survivor so its exit edge can
  // fire. For preFit / hardStop / exhausted, land on the preserved boundary
  // slot.
  return fit.kind === "naturalFit"
    ? i + replacements.length - 1
    : i + replacements.length;
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
  // The walker promotes preFit at a non-sentinel Travel span to
  // overconstrained, so we never see a preFit fit.slot of type "travel"
  // here unless it's a zero-distance sentinel (where the whole span IS one
  // logical slot at startIdx and there's no separate endIdx to worry about).
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
  // The wrapper extension can push travelStart later than the walker chose.
  const bleed = detectBleedRecovery(
    absorbStartIdx > 0 ? slots[absorbStartIdx - 1] : undefined,
    categories,
    slots[absorbStartIdx].start,
  );

  let travelStart = fit.travelStart;
  if (travelStart.getTime() < bleed.floor.getTime()) {
    travelStart = bleed.floor;
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

  // Geometric overconstrained: the new travel slot duration vs natural T.
  // Captures every case — preFit where T < consumed (the slot is wider than
  // the trip), bleed recovery pushing travelStart later, and the walker's
  // explicit "overconstrained" kind.
  const slotDurMs = regionEnd.getTime() - travelStart.getTime();
  const naturalDurMs = fit.T * 60000;
  const overconstrained = slotDurMs > naturalDurMs;

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
  let boundary: Date;
  let removeCount: number;
  const consumedCategoryIds = [...fit.consumedCategoryIds];

  switch (fit.kind) {
    case "naturalFit": {
      destination = fit.destination;
      T = fit.T;
      boundary = fit.travelEnd;
      if (
        fit.slot.type === "category" &&
        boundary.getTime() > fit.slot.start.getTime()
      ) {
        consumedCategoryIds.push(fit.slot.categoryId);
      } else if (
        fit.slot.type === "travel" &&
        fit.slot.consumedCategoryIds &&
        boundary.getTime() > fit.slot.start.getTime()
      ) {
        consumedCategoryIds.push(...fit.slot.consumedCategoryIds);
      }
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
      boundary = fit.slot.start;
      removeCount = fit.idx - i;
      recorder?.decision(
        M.forwardBypassCascade.endAtSlotStart(T, fit.consumed, fit.idx),
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
      boundary = fit.hardStopSlot.start;
      removeCount = fit.idx - i;
      break;
    }
    case "exhausted": {
      const lastIdx = slots.length - 1;
      boundary = lastIdx > i ? slots[lastIdx].end : current.end;
      removeCount = slots.length - i;
      break;
    }
  }

  // Track the final chosen leg before placement.
  travelManager.trackLeg(A, destination);

  // Rigorous geometry mirrors bypassCategoryCascade — the travel fills the
  // entire absorbed region as one atomic transit. The user is in transit
  // from current.start (= the moment they exited the previous slot at A)
  // until they arrive at the boundary the walker chose:
  //
  //   travel.start = current.start                  (= absorb-region start)
  //   travel.end   = boundary                       (= region end)
  //
  //   overconstrained when slot.dur > T
  //   insufficient    when slot.dur < T (hardStop / exhausted only)
  //
  // For naturalFit the boundary IS T after travelStart, so the slot
  // duration matches T exactly; the landing slot's tail survives as the
  // landing-slot survivor.
  const travelStart = current.start;
  const travelEnd = boundary;
  const slotDurMs = travelEnd.getTime() - travelStart.getTime();
  const naturalDurMs = T * 60000;
  const insufficient = slotDurMs < naturalDurMs;
  const overconstrained = slotDurMs > naturalDurMs;

  const absorbed = slots.slice(i, i + removeCount);
  const shardSources = collectShardSources(absorbed, travelStart, travelEnd);
  const shards = createTravelShards(
    shardSources,
    uuidv4(),
    A,
    destination,
    "preliminary",
    insufficient || overconstrained
      ? {
          insufficientTravel: insufficient,
          requiredTravelMinutes: T,
          overconstrained: overconstrained || undefined,
        }
      : undefined,
  );
  if (shards.length > 0) {
    shards[0].consumedCategoryIds = (
      shards[0].consumedCategoryIds ?? []
    ).concat(consumedCategoryIds);
  }

  const replacements: Slot[] = [...shards];

  if (fit.kind === "naturalFit") {
    replacements.push(
      buildLandingSurvivor(fit.slot, travelEnd, destination),
    );
  }

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
  return fit.kind === "naturalFit"
    ? i + replacements.length - 1
    : i + replacements.length;
}
