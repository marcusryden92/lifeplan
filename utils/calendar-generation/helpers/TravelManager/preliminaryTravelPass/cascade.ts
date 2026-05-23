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
  findTravelShardSpan,
  restoreAbsorbedRange,
  shardSourceFromAvailable,
  shardSourceFromCategory,
  type ShardSource,
} from "../../../utils/timeSlotUtils";
import { TravelPassRecorder } from "../TravelPassRecorder";
import { M } from "../travelPassMessages";
import {
  detectBleedRecovery,
  findCategoryWrapperEnd,
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
  spliceBleedNext,
  spliceBleedPrev,
} from "./slotShape";
import { v4 as uuidv4 } from "uuid";

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

export type CascadeAnchorFit =
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

export type CascadeAnchorResult =
  | CascadeAnchorFit
  | { kind: "abort"; reason: "available" | "hardStop" | "exhausted" };

export function findCascadeAnchor(
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
// Mirror of bypassCategoryCascade. Walks backward looking for an earlier
// Category whose location lets the travel fit in the accumulated span.
// First-fit wins. Absorbed travels in between get untracked; absorbed
// categories go into consumedCategoryIds. If the slot ends up bigger than
// the actual travel duration, marks overconstrained.
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

export function applyTravelAnchorAbsorb(
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

  // Recover the original-fabric boundary if the slot just before the absorb
  // is a bleed-trimmed Category. headBoundary plays a dual role: it's both
  // the floor for the new travel's start (we can't begin before the restored
  // wrapper end) AND the start of head restoration (the prev-cat now owns
  // [absorbStart, wrapperEnd], so absorbed shards in that region must not be
  // re-emitted as fragments).
  const bleed = detectBleedRecovery(
    !precedingAvailable && absorbStartIdx > 0
      ? slots[absorbStartIdx - 1]
      : undefined,
    categories,
    slots[absorbStartIdx].start,
  );
  const headBoundary = bleed.floor;

  const removeCount = i - absorbStartIdx + 1;
  const absorbed = slots.slice(absorbStartIdx, absorbStartIdx + removeCount);

  // Latest absorb-region boundary ≤ natural where head restoration only
  // crosses Available-like spans. Falls back to absorbStart if natural is
  // before the absorb, or to the slot.start of the Cat-like interior natural
  // lands in (consume the whole Cat/sentinel rather than partial-restore).
  const safeHeadBoundary =
    latestSafeBoundary(absorbed, naturalTravelStart) ??
    slots[absorbStartIdx].start;
  const travelStart =
    safeHeadBoundary.getTime() < headBoundary.getTime()
      ? headBoundary
      : safeHeadBoundary;
  // Overconstrained when the snap or the bleed-trimmed cat forced the
  // travel to start earlier than its natural T-derived position.
  const overconstrained =
    travelStart.getTime() < naturalTravelStart.getTime();

  // Collect consumedCategoryIds: only absorbed Cats / sentinels whose time
  // region falls inside the travel span [travelStart, regionEnd]. Slots whose
  // region sits in the head-restored zone [absorbStart, travelStart) keep
  // their original character via head restoration (or via the bleed-trimmed
  // prev cat's wrapper restoration) — those Cats survive as live slots and
  // must NOT be double-counted as consumed.
  //
  // For Travel-shard absorbed slots: pull both the shard's own consumed list
  // (sentinel case) AND its originalCategoryId (Cat-fragment case). Deduped
  // because a bled Cat can leave multiple fragments that all carry the same
  // originalCategoryId. The anchor (slots[anchorIdx]) is included so a Travel
  // anchor that originated from a Cat source contributes its identity too.
  const travelStartMs = travelStart.getTime();
  const consumedSet = new Set<string>();
  for (let k = anchorIdx; k <= i; k++) {
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

  // Restore the head [headBoundary, travelStart] from the absorbed slots'
  // original characters. The boundary is `headBoundary` from above — when a
  // bleed-trimmed prev Category is restored to its wrapper end, that prev
  // cat now owns [absorbedStart, wrapperEnd], so head restoration must start
  // at wrapperEnd to avoid duplicating that region.
  const headFragments = restoreAbsorbedRange(absorbed, headBoundary, travelStart);
  if (headFragments.length > 0) {
    const last = headFragments[headFragments.length - 1];
    if (last.type === "available") last.nextLocationId = A;
  }

  const replacements: Slot[] = [...headFragments, ...shards];

  bleed.restore();

  slots.splice(absorbStartIdx, removeCount, ...replacements);
  if (recorder) {
    recorder.action(actionMessage(absorbed.map((s) => recorder.label(s))));
  }
  return absorbStartIdx + replacements.length;
}

export function applyCategoryAnchorPlacement(
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
