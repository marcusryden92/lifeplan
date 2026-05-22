/**
 * dropUnreachableCategoryVisits
 *
 * Pre-pass run before preliminaryTravelPass. Detects three contiguous
 * Category slots [catA, catB, catC] where:
 *
 *   - catA.currentLocationId === catC.currentLocationId
 *   - catB.currentLocationId differs from both
 *   - The symmetric bleed catA <-> catB fits, BUT after that bleed shortens
 *     catB, the catB <-> catC symmetric bleed no longer fits.
 *
 * In that situation, the walker's normal placement would visibly route the
 * user out to catB's location and back to catA's location, only to find
 * there's no room to complete the leg. The right answer is to drop the
 * unreachable catB visit entirely — the user stays at catA's location
 * through catB's time. catB is replaced in-place by a zero-distance
 * overconstrained Travel slot at catA's location, with catB's id recorded
 * on the travel's consumedCategoryIds so the wrapper marker scanner stamps
 * the right boundary.
 *
 * Replaces the inline "Jump cat 2" lookahead that used to live inside
 * bleedAcrossCategoryBoundary. Lifting it upstream means the walker reaches
 * the cat boundary with catB already gone, so bleedAcrossCategoryBoundary
 * keeps a clean symmetric-or-trespass shape.
 */

import { CategorySlot, Slot } from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";
import {
  createTravelShards,
  shardSourceFromCategory,
} from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";

export function dropUnreachableCategoryVisits(
  hasLocationMap: boolean,
  slots: Slot[],
  travelManager: TravelManager,
): void {
  if (!hasLocationMap) return;

  let i = 0;
  while (i + 2 < slots.length) {
    const catA = slots[i];
    const catB = slots[i + 1];
    const catC = slots[i + 2];
    if (
      catA.type !== "category" ||
      catB.type !== "category" ||
      catC.type !== "category"
    ) {
      i += 1;
      continue;
    }

    if (catB.start.getTime() !== catA.end.getTime()) {
      i += 1;
      continue;
    }
    if (catC.start.getTime() !== catB.end.getTime()) {
      i += 1;
      continue;
    }

    if (shouldDropCatB(catA, catB, catC, travelManager)) {
      replaceCatBWithZeroDistanceTravel(slots, i + 1, catA, catB);
      // The replacement is a single travel slot at the same index; advance
      // past it. catC is now at i + 2 again.
      i += 1;
      continue;
    }

    i += 1;
  }
}

function shouldDropCatB(
  catA: CategorySlot,
  catB: CategorySlot,
  catC: CategorySlot,
  travelManager: TravelManager,
): boolean {
  const locA = catA.currentLocationId;
  const locB = catB.currentLocationId;
  const locC = catC.currentLocationId;
  if (!locA || !locB || !locC) return false;
  if (locA !== locC) return false;
  if (locA === locB) return false;

  // T_AB: catA -> catB travel time. The walker would attempt to symmetric-
  // bleed this across catA.end / catB.start. We only act when that bleed
  // would fit — if it wouldn't fit, the regular trespass-boundary path
  // already handles the case cleanly.
  const T_AB = travelManager.getTravelTime(locA, locB, catB.start);
  if (T_AB <= 0) return false;
  const half_AB = T_AB / 2;
  if (half_AB >= catA.durationMinutes) return false;
  if (half_AB >= catB.durationMinutes) return false;

  // T_BC: catB -> catC travel time. After the catA<->catB bleed eats half_AB
  // from catB's head, catB's remaining duration must still leave room for
  // the catB<->catC symmetric bleed.
  const T_BC = travelManager.getTravelTime(locB, locC, catB.end);
  if (T_BC <= 0) return false;
  const half_BC = T_BC / 2;
  const postBleedCatB = catB.durationMinutes - half_AB;

  // Drop catB when its post-bleed remainder can't carry the catB<->catC bleed.
  return half_BC >= postBleedCatB || half_BC >= catC.durationMinutes;
}

function replaceCatBWithZeroDistanceTravel(
  slots: Slot[],
  catBIdx: number,
  catA: CategorySlot,
  catB: CategorySlot,
): void {
  const sameLoc = catA.currentLocationId!;
  const shards = createTravelShards(
    [shardSourceFromCategory(catB, catB.start, catB.end)],
    uuidv4(),
    sameLoc,
    sameLoc,
    "preliminary",
    { overconstrained: true, requiredTravelMinutes: 0 },
  );
  if (shards.length > 0) {
    shards[0].consumedCategoryIds = (shards[0].consumedCategoryIds ?? []).concat(
      catB.categoryId,
    );
  }
  slots.splice(catBIdx, 1, ...shards);
}
