import { Slot } from "../../../models/TimeSlot";

export function isAvailableLike(slot: Slot): boolean {
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
export function logicalCategoryId(slot: Slot): string | null {
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
export type LogicalChunk = {
  start: Date;
  end: Date;
  isAvailable: boolean;
  catId: string | null;
};

export function coalesceAbsorbed(absorbed: Slot[]): LogicalChunk[] {
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

// Cascade safety rule for both directions. The natural travel start is
// `regionEnd - T` (backward) or `travelEnd - T` (forward). If that point
// lands strictly inside a Cat (or chain of fragments belonging to the same
// original Cat), starting the new travel there would either carve a partial-
// Cat fragment (backward head restoration) or leave a head leftover at A
// during cat time (forward shrink). Both are invalid — original Cats are
// atomic. Returns the latest original-fabric boundary ≤ natural, or
// absorbStart when natural is before the absorb begins.
//
// Boundaries within Available-like spans are all safe (Available can be
// partial-split). Boundaries WITHIN a Cat are forbidden — only the Cat's
// logical start and end count. The coalescing step reconstructs the original
// Cat span from any bled fragments so the scanner doesn't mistakenly treat a
// fragment seam (e.g. 11:04 in a [11:00-12:00] Cat that was bled at 11:04)
// as an original-fabric boundary.
export function latestSafeBoundary(
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
