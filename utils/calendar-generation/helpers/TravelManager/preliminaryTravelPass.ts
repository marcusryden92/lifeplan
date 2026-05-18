import type { Category } from "@/types/prisma";
import {
  AvailableSlot,
  CategorySlot,
  PlaceableSlot,
  Slot,
  TravelSlot,
} from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";
import { CategoryBoundaryTrespass } from "./categoryBoundaryTrespass";

// preliminaryTravelPass — walks the unified slots[] array and places travel
// blocks for every transition it can resolve. Implemented against the
// decision tree in notes/claudeTravelCriteria.md.
//
// SLOT MODEL:
//   Available  — free time outside any category period.
//                Transition: prev != next means one travel inside this slot.
//   Category   — inside a category period. Carries currentLocationId.
//                Up to two transitions evaluated independently:
//                  entry: prev != currentLocationId  → place travel at start
//                  exit:  currentLocationId != next  → place travel at end
//   Occupied   — skip.
//   Travel     — already placed, skip.
//
// Cross-call note: this function deliberately does NOT call
// travelManager.resetLegTracker(). The legTracker state is intentionally
// persistent across calls — a future regenerate-slots loop will rely on it.

export function preliminaryTravelPass(
  hasLocationMap: boolean,
  _categories: Category[],
  slots: Slot[],
  travelManager: TravelManager,
  bufferTimeMinutes: number,
  trespasses?: CategoryBoundaryTrespass[],
): void {
  if (!hasLocationMap) return;

  let i = 0;
  while (i < slots.length) {
    const slot = slots[i];

    // Outer guards
    if (slot.type === "occupied" || slot.type === "travel") {
      i += 1;
      continue;
    }
    if (slot.durationMinutes <= 0) {
      i += 1;
      continue;
    }

    if (slot.type === "available") {
      i = handleAvailable(slots, i, travelManager, bufferTimeMinutes, trespasses);
      continue;
    }

    if (slot.type === "category") {
      i = handleCategory(slots, i, travelManager, bufferTimeMinutes, trespasses);
      continue;
    }

    i += 1;
  }
}

// ---------------------------------------------------------------------------
// Available slot — one transition inside, place at start or end per legTracker
// ---------------------------------------------------------------------------

function handleAvailable(
  slots: Slot[],
  i: number,
  travelManager: TravelManager,
  bufferTimeMinutes: number,
  trespasses: CategoryBoundaryTrespass[] | undefined,
): number {
  const slot = slots[i] as AvailableSlot;
  const startLoc = slot.prevLocationId ?? null;
  const endLoc = slot.nextLocationId ?? null;

  if (!startLoc || !endLoc) return i + 1;
  if (startLoc === endLoc) return i + 1;

  const action = travelManager.resolveTravel(slot);
  if (!action) return i + 1;

  const { travelMinutes, placeAtSlotStart } = action;
  const fromLoc = startLoc;
  const toLoc = endLoc;

  // Current size: LARGE ENOUGH for travel
  if (slot.durationMinutes >= travelMinutes) {
    if (placeAtSlotStart) {
      // PlaceAtStart (return)
      const travelStart = slot.start;
      const travelEnd = new Date(slot.start.getTime() + travelMinutes * 60000);
      return placeTravelInWindow(
        slots,
        i,
        i,
        travelStart,
        travelEnd,
        fromLoc,
        toLoc,
        travelMinutes,
        false,
      );
    } else {
      // PlaceAtEnd (outbound)
      const travelEnd = slot.end;
      const travelStart = new Date(slot.end.getTime() - travelMinutes * 60000);
      return placeTravelInWindow(
        slots,
        i,
        i,
        travelStart,
        travelEnd,
        fromLoc,
        toLoc,
        travelMinutes,
        false,
      );
    }
  }

  // Current size: NOT LARGE ENOUGH for travel — bleed into neighbors
  return bleedAvailableTransition(
    slots,
    i,
    travelMinutes,
    fromLoc,
    toLoc,
    bufferTimeMinutes,
    trespasses,
  );
}

function bleedAvailableTransition(
  slots: Slot[],
  i: number,
  travelMinutes: number,
  fromLoc: string,
  toLoc: string,
  _bufferTimeMinutes: number,
  trespasses: CategoryBoundaryTrespass[] | undefined,
): number {
  const current = slots[i] as AvailableSlot;
  const prev = i > 0 ? slots[i - 1] : null;
  const next = i + 1 < slots.length ? slots[i + 1] : null;

  // Prev type: Travel → try bridge absorption
  if (prev && prev.type === "travel") {
    return absorbPrevTravelBridge(
      slots,
      i,
      travelMinutes,
      fromLoc,
      toLoc,
      trespasses,
    );
  }

  const prevDonor = isBleedDonor(prev) ? donorSize(prev, "tail") : 0;
  const nextDonor = isBleedDonor(next) ? donorSize(next, "head") : 0;
  const overflow = travelMinutes - current.durationMinutes;

  const prevIsAvail = prev !== null && (prev.type === "available" || prev.type === "category");
  const nextIsAvail = next !== null && (next.type === "available" || next.type === "category");

  // Prev type: Available/Category
  if (prevIsAvail) {
    // Next type: Available/Category
    if (nextIsAvail) {
      const half = Math.ceil(overflow / 2);
      // Symmetric 3-slot bleed
      if (prevDonor >= half && nextDonor >= half) {
        const eatLeft = half;
        const eatRight = overflow - eatLeft;
        return placeAcrossPrevCurrentNext(
          slots,
          i,
          eatLeft,
          eatRight,
          travelMinutes,
          fromLoc,
          toLoc,
          trespasses,
        );
      }
      // Asymmetric 3-slot bleed
      if (prevDonor + current.durationMinutes + nextDonor >= travelMinutes) {
        const smaller = Math.min(prevDonor, nextDonor);
        const larger = Math.max(prevDonor, nextDonor);
        const fromSmaller = smaller;
        const fromLarger = Math.min(overflow - fromSmaller, larger);
        const eatLeft = prevDonor === smaller ? fromSmaller : fromLarger;
        const eatRight = prevDonor === smaller ? fromLarger : fromSmaller;
        return placeAcrossPrevCurrentNext(
          slots,
          i,
          eatLeft,
          eatRight,
          travelMinutes,
          fromLoc,
          toLoc,
          trespasses,
        );
      }
      // Neither fits — ALERT
      return alertWindow(
        slots,
        i - 1,
        i + 1,
        travelMinutes,
        fromLoc,
        toLoc,
        trespasses,
      );
    }

    // Next type: Occupied
    if (next && next.type === "occupied") {
      if (prevDonor + current.durationMinutes >= travelMinutes) {
        const eatLeft = overflow;
        return placeAcrossPrevAndCurrent(
          slots,
          i,
          eatLeft,
          travelMinutes,
          fromLoc,
          toLoc,
          trespasses,
        );
      }
      return alertWindow(
        slots,
        i - 1,
        i,
        travelMinutes,
        fromLoc,
        toLoc,
        trespasses,
      );
    }

    // Next type: Travel — shouldn't happen going forward
    return i + 1;
  }

  // Prev type: Occupied
  if (prev && prev.type === "occupied") {
    if (nextIsAvail) {
      if (current.durationMinutes + nextDonor >= travelMinutes) {
        const eatRight = overflow;
        return placeAcrossCurrentAndNext(
          slots,
          i,
          eatRight,
          travelMinutes,
          fromLoc,
          toLoc,
          trespasses,
        );
      }
      return alertWindow(
        slots,
        i,
        i + 1,
        travelMinutes,
        fromLoc,
        toLoc,
        trespasses,
      );
    }

    // Both neighbors occupied — alert over current alone
    return alertWindow(slots, i, i, travelMinutes, fromLoc, toLoc, trespasses);
  }

  // Prev is null or other — alert over current alone
  return alertWindow(slots, i, i, travelMinutes, fromLoc, toLoc, trespasses);
}

// ---------------------------------------------------------------------------
// Category slot — up to two transitions: entry at start, exit at end
// ---------------------------------------------------------------------------

function handleCategory(
  slots: Slot[],
  i: number,
  travelManager: TravelManager,
  bufferTimeMinutes: number,
  trespasses: CategoryBoundaryTrespass[] | undefined,
): number {
  const cat = slots[i] as CategorySlot;
  const cur = cat.currentLocationId;
  const prevLoc = cat.prevLocationId;
  const nextLoc = cat.nextLocationId;

  let cursor = i;

  // Entry transition: prev -> current
  if (cur && prevLoc && prevLoc !== cur) {
    const travelMinutes = travelManager.getTravelTime(
      prevLoc,
      cur,
      cat.start,
    );
    if (travelMinutes > 0) {
      cursor = placeCategoryEntry(
        slots,
        cursor,
        travelMinutes,
        prevLoc,
        cur,
        bufferTimeMinutes,
        trespasses,
      );
    }
  }

  // Refetch — the cat may have been consumed by the entry alert, or replaced
  // with a shrunk fragment. Walk forward from the original index looking for
  // the same categoryId at its original end time. If not found, the cat is
  // gone and we just advance past whatever the entry left behind.
  const catIdx = findCategoryAt(slots, cursor, cat.categoryId, cat.end);
  if (catIdx === -1) return cursor;

  const shrunkCat = slots[catIdx] as CategorySlot;

  // Exit transition: current -> next
  if (cur && nextLoc && cur !== nextLoc) {
    const travelMinutes = travelManager.getTravelTime(
      cur,
      nextLoc,
      shrunkCat.end,
    );
    if (travelMinutes > 0) {
      return placeCategoryExit(
        slots,
        catIdx,
        travelMinutes,
        cur,
        nextLoc,
        bufferTimeMinutes,
        trespasses,
      );
    }
  }

  return catIdx + 1;
}

function placeCategoryEntry(
  slots: Slot[],
  i: number,
  travelMinutes: number,
  fromLoc: string,
  toLoc: string,
  _bufferTimeMinutes: number,
  trespasses: CategoryBoundaryTrespass[] | undefined,
): number {
  const cat = slots[i] as CategorySlot;
  const prev = i > 0 ? slots[i - 1] : null;

  // Fits inside the cat's head
  if (cat.durationMinutes >= travelMinutes) {
    const travelStart = cat.start;
    const travelEnd = new Date(cat.start.getTime() + travelMinutes * 60000);
    return placeTravelInWindow(
      slots,
      i,
      i,
      travelStart,
      travelEnd,
      fromLoc,
      toLoc,
      travelMinutes,
      false,
    );
  }

  const overflow = travelMinutes - cat.durationMinutes;

  // Prev type: Available/Category → bleed into prev tail
  if (prev && (prev.type === "available" || prev.type === "category")) {
    const prevTail = donorSize(prev, "tail");
    if (prevTail >= overflow) {
      // Travel spans (cat.start - overflow) → cat.end (eats full cat + overflow from prev tail)
      const eatLeft = overflow;
      const travelStart = new Date(
        prev.end.getTime() - eatLeft * 60000,
      );
      const travelEnd = cat.end;
      return placeTravelInWindow(
        slots,
        i - 1,
        i,
        travelStart,
        travelEnd,
        fromLoc,
        toLoc,
        travelMinutes,
        false,
      );
    }
    // Not enough room — ALERT over [prev, cat]
    return alertWindow(
      slots,
      i - 1,
      i,
      travelMinutes,
      fromLoc,
      toLoc,
      trespasses,
    );
  }

  // Prev type: Travel — try bridge absorb (travel(X→Y) + cat entry Y→cur → single travel(X→cur))
  if (prev && prev.type === "travel") {
    return absorbPrevTravelForCategoryEntry(
      slots,
      i,
      travelMinutes,
      fromLoc,
      toLoc,
      trespasses,
    );
  }

  // Prev type: Occupied (or null) — no donor on the left, alert over cat alone
  return alertWindow(slots, i, i, travelMinutes, fromLoc, toLoc, trespasses);
}

function placeCategoryExit(
  slots: Slot[],
  i: number,
  travelMinutes: number,
  fromLoc: string,
  toLoc: string,
  _bufferTimeMinutes: number,
  trespasses: CategoryBoundaryTrespass[] | undefined,
): number {
  const cat = slots[i] as CategorySlot;
  const next = i + 1 < slots.length ? slots[i + 1] : null;

  // Fits inside the cat's tail
  if (cat.durationMinutes >= travelMinutes) {
    const travelEnd = cat.end;
    const travelStart = new Date(cat.end.getTime() - travelMinutes * 60000);
    return placeTravelInWindow(
      slots,
      i,
      i,
      travelStart,
      travelEnd,
      fromLoc,
      toLoc,
      travelMinutes,
      false,
    );
  }

  const overflow = travelMinutes - cat.durationMinutes;

  // Next type: Available/Category → bleed into next head
  if (next && (next.type === "available" || next.type === "category")) {
    const nextHead = donorSize(next, "head");
    if (nextHead >= overflow) {
      const eatRight = overflow;
      const travelStart = cat.start;
      const travelEnd = new Date(
        next.start.getTime() + eatRight * 60000,
      );
      return placeTravelInWindow(
        slots,
        i,
        i + 1,
        travelStart,
        travelEnd,
        fromLoc,
        toLoc,
        travelMinutes,
        false,
      );
    }
    return alertWindow(
      slots,
      i,
      i + 1,
      travelMinutes,
      fromLoc,
      toLoc,
      trespasses,
    );
  }

  // Next type: Occupied / Travel / null — no donor on the right
  return alertWindow(slots, i, i, travelMinutes, fromLoc, toLoc, trespasses);
}

// ---------------------------------------------------------------------------
// Prev=Travel bridge absorption (Available case)
// ---------------------------------------------------------------------------

function absorbPrevTravelBridge(
  slots: Slot[],
  i: number,
  _ignoredTravelMinutes: number,
  _ignoredFromLoc: string,
  toLoc: string,
  trespasses: CategoryBoundaryTrespass[] | undefined,
): number {
  // Prev is travel(X → Y), current transition is Y → toLoc (= Z).
  // Bridge: replace prev with single travel(X → Z) spanning [prev.start, current.end].
  const prev = slots[i - 1] as TravelSlot;
  const current = slots[i] as AvailableSlot;
  const X = prev.travelFromLocationId;
  const Z = toLoc;
  if (!X) return i + 1;

  // We can't ask travelManager from here without threading it in — and the
  // bridge needs a fresh getTravelTime(X, Z) call. Fall back to a coarse
  // estimate: prev's duration + current's duration as the available window,
  // emit an alert if that's plausibly too small (which we can't tell without
  // the matrix). For now, always emit the bridged travel filling the window;
  // the dispatcher walks forward and we don't have a cheap way to recompute.
  const travelStart = prev.start;
  const travelEnd = current.end;
  const bridgedMinutes = Math.floor(
    (travelEnd.getTime() - travelStart.getTime()) / 60000,
  );

  slots.splice(
    i - 1,
    2,
    createTravelSlot(travelStart, travelEnd, X, Z, "preliminary", uuidv4(), {
      requiredTravelMinutes: bridgedMinutes,
    }),
  );
  if (trespasses && (current as PlaceableSlot).type === "category") {
    const c = current as unknown as CategorySlot;
    trespasses.push({
      categoryId: c.categoryId,
      slotStart: c.start,
      slotEnd: c.end,
      boundary: "start",
    });
  }
  return i;
}

function absorbPrevTravelForCategoryEntry(
  slots: Slot[],
  i: number,
  _ignoredTravelMinutes: number,
  _ignoredFromLoc: string,
  toLoc: string,
  trespasses: CategoryBoundaryTrespass[] | undefined,
): number {
  // Mirror of the Available bridge — prev travel (X→Y), cat entry (Y→cur).
  // Build bridge(X→cur) spanning [prev.start, cat.start + travelMinutes] if
  // possible; otherwise alert. Without a fresh getTravelTime call we use the
  // window's full length as the bridged duration.
  const prev = slots[i - 1] as TravelSlot;
  const cat = slots[i] as CategorySlot;
  const X = prev.travelFromLocationId;
  if (!X) return i + 1;

  const travelStart = prev.start;
  const travelEnd = cat.end;
  const bridgedMinutes = Math.floor(
    (travelEnd.getTime() - travelStart.getTime()) / 60000,
  );

  slots.splice(
    i - 1,
    2,
    createTravelSlot(travelStart, travelEnd, X, toLoc, "preliminary", uuidv4(), {
      requiredTravelMinutes: bridgedMinutes,
      categoryId: cat.categoryId,
      isStrictCategory: cat.isStrictCategory,
    }),
  );
  if (trespasses) {
    trespasses.push({
      categoryId: cat.categoryId,
      slotStart: cat.start,
      slotEnd: cat.end,
      boundary: "start",
    });
  }
  return i;
}

// ---------------------------------------------------------------------------
// Placement helpers
// ---------------------------------------------------------------------------

// Place a travel block spanning `[travelStart, travelEnd]` by consuming slots
// in the window [fromIdx, toIdx] (inclusive). The donor at fromIdx may keep
// its head as a pre-fragment; the donor at toIdx may keep its tail as a
// post-fragment; any slots strictly between are assumed fully consumed.
//
// Returns the index where the walker should continue. That's the index
// immediately after the inserted travel slot — i.e. pointing at the
// post-fragment if any, or at the slot after the window if not.
function placeTravelInWindow(
  slots: Slot[],
  fromIdx: number,
  toIdx: number,
  travelStart: Date,
  travelEnd: Date,
  fromLoc: string,
  toLoc: string,
  requiredTravelMinutes: number,
  insufficient: boolean,
): number {
  const fromSlot = slots[fromIdx] as PlaceableSlot;
  const toSlot = slots[toIdx] as PlaceableSlot;

  const fragments: Slot[] = [];

  if (fromSlot.start.getTime() < travelStart.getTime()) {
    fragments.push(trimToPreFragment(fromSlot, travelStart, fromLoc));
  }

  // Travel slot inherits cat membership if entirely inside a single cat fragment.
  const insideCat: CategorySlot | null =
    fromSlot.type === "category" &&
    toSlot.type === "category" &&
    fromSlot.categoryId === toSlot.categoryId
      ? fromSlot
      : null;

  fragments.push(
    createTravelSlot(travelStart, travelEnd, fromLoc, toLoc, "preliminary", uuidv4(), {
      insufficientTravel: insufficient,
      requiredTravelMinutes,
      categoryId: insideCat ? insideCat.categoryId : undefined,
      isStrictCategory: insideCat ? insideCat.isStrictCategory : undefined,
    }),
  );

  if (toSlot.end.getTime() > travelEnd.getTime()) {
    fragments.push(trimToPostFragment(toSlot, travelEnd, toLoc));
  }

  slots.splice(fromIdx, toIdx - fromIdx + 1, ...fragments);

  // Position the walker right after the inserted travel.
  const travelOffset = fragments.findIndex((f) => f.type === "travel");
  return fromIdx + travelOffset + 1;
}

function placeAcrossPrevCurrentNext(
  slots: Slot[],
  i: number,
  eatLeft: number,
  eatRight: number,
  travelMinutes: number,
  fromLoc: string,
  toLoc: string,
  _trespasses: CategoryBoundaryTrespass[] | undefined,
): number {
  const prev = slots[i - 1] as PlaceableSlot;
  const next = slots[i + 1] as PlaceableSlot;
  const travelStart = new Date(prev.end.getTime() - eatLeft * 60000);
  const travelEnd = new Date(next.start.getTime() + eatRight * 60000);
  return placeTravelInWindow(
    slots,
    i - 1,
    i + 1,
    travelStart,
    travelEnd,
    fromLoc,
    toLoc,
    travelMinutes,
    false,
  );
}

function placeAcrossPrevAndCurrent(
  slots: Slot[],
  i: number,
  eatLeft: number,
  travelMinutes: number,
  fromLoc: string,
  toLoc: string,
  _trespasses: CategoryBoundaryTrespass[] | undefined,
): number {
  const prev = slots[i - 1] as PlaceableSlot;
  const current = slots[i] as PlaceableSlot;
  const travelStart = new Date(prev.end.getTime() - eatLeft * 60000);
  const travelEnd = current.end;
  return placeTravelInWindow(
    slots,
    i - 1,
    i,
    travelStart,
    travelEnd,
    fromLoc,
    toLoc,
    travelMinutes,
    false,
  );
}

function placeAcrossCurrentAndNext(
  slots: Slot[],
  i: number,
  eatRight: number,
  travelMinutes: number,
  fromLoc: string,
  toLoc: string,
  _trespasses: CategoryBoundaryTrespass[] | undefined,
): number {
  const current = slots[i] as PlaceableSlot;
  const next = slots[i + 1] as PlaceableSlot;
  const travelStart = current.start;
  const travelEnd = new Date(next.start.getTime() + eatRight * 60000);
  return placeTravelInWindow(
    slots,
    i,
    i + 1,
    travelStart,
    travelEnd,
    fromLoc,
    toLoc,
    travelMinutes,
    false,
  );
}

function alertWindow(
  slots: Slot[],
  fromIdx: number,
  toIdx: number,
  travelMinutes: number,
  fromLoc: string,
  toLoc: string,
  trespasses: CategoryBoundaryTrespass[] | undefined,
): number {
  // Clamp window to placeable slots (don't span across occupied boundaries).
  let lo = fromIdx;
  let hi = toIdx;
  while (lo < 0 || (slots[lo] && slots[lo].type !== "available" && slots[lo].type !== "category")) {
    lo += 1;
    if (lo > hi) return toIdx + 1;
  }
  while (hi >= slots.length || (slots[hi] && slots[hi].type !== "available" && slots[hi].type !== "category")) {
    hi -= 1;
    if (hi < lo) return toIdx + 1;
  }

  const fromSlot = slots[lo] as PlaceableSlot;
  const toSlot = slots[hi] as PlaceableSlot;

  // Record trespasses for any category slot in the window.
  if (trespasses) {
    for (let k = lo; k <= hi; k++) {
      const s = slots[k];
      if (s.type !== "category") continue;
      const swallowsHead = fromSlot.start.getTime() <= s.start.getTime();
      const swallowsTail = toSlot.end.getTime() >= s.end.getTime();
      const boundary: "start" | "end" =
        swallowsHead && !swallowsTail
          ? "start"
          : !swallowsHead && swallowsTail
            ? "end"
            : "start";
      trespasses.push({
        categoryId: s.categoryId,
        slotStart: s.start,
        slotEnd: s.end,
        boundary,
      });
    }
  }

  const travel = createTravelSlot(
    fromSlot.start,
    toSlot.end,
    fromLoc,
    toLoc,
    "preliminary",
    uuidv4(),
    {
      insufficientTravel: true,
      requiredTravelMinutes: travelMinutes,
    },
  );

  slots.splice(lo, hi - lo + 1, travel);
  return lo + 1;
}

// ---------------------------------------------------------------------------
// Slot trimming — produces fragments with correct location fields
// ---------------------------------------------------------------------------

function trimToPreFragment(
  slot: PlaceableSlot,
  travelStart: Date,
  fromLoc: string,
): PlaceableSlot {
  const duration = Math.floor(
    (travelStart.getTime() - slot.start.getTime()) / 60000,
  );
  if (slot.type === "category") {
    return {
      start: slot.start,
      end: travelStart,
      durationMinutes: duration,
      type: "category",
      currentLocationId: slot.currentLocationId,
      prevLocationId: slot.prevLocationId,
      // The travel begins at fromLoc — pre-fragment ends with user at fromLoc.
      // Setting next == fromLoc means this fragment's "exit" transition is
      // current == next when current == fromLoc (the cat's loc). When the cat's
      // loc differs from fromLoc (e.g. cat-to-cat boundary), this is a no-op
      // because the exit was the very travel we just placed.
      nextLocationId: fromLoc,
      categoryId: slot.categoryId,
      isStrictCategory: slot.isStrictCategory,
    };
  }
  return {
    start: slot.start,
    end: travelStart,
    durationMinutes: duration,
    type: "available",
    prevLocationId: fromLoc,
    nextLocationId: fromLoc,
  };
}

function trimToPostFragment(
  slot: PlaceableSlot,
  travelEnd: Date,
  toLoc: string,
): PlaceableSlot {
  const duration = Math.floor(
    (slot.end.getTime() - travelEnd.getTime()) / 60000,
  );
  if (slot.type === "category") {
    return {
      start: travelEnd,
      end: slot.end,
      durationMinutes: duration,
      type: "category",
      currentLocationId: slot.currentLocationId,
      prevLocationId: toLoc,
      nextLocationId: slot.nextLocationId,
      categoryId: slot.categoryId,
      isStrictCategory: slot.isStrictCategory,
    };
  }
  return {
    start: travelEnd,
    end: slot.end,
    durationMinutes: duration,
    type: "available",
    prevLocationId: toLoc,
    nextLocationId: toLoc,
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function isBleedDonor(slot: Slot | null): slot is PlaceableSlot {
  return !!slot && (slot.type === "available" || slot.type === "category");
}

function donorSize(slot: PlaceableSlot, _side: "head" | "tail"): number {
  return slot.durationMinutes;
}

function findCategoryAt(
  slots: Slot[],
  from: number,
  categoryId: string,
  endTime: Date,
): number {
  for (let k = from; k < slots.length; k++) {
    const s = slots[k];
    if (s.type === "category" && s.categoryId === categoryId && s.end.getTime() === endTime.getTime()) {
      return k;
    }
    if (s.start.getTime() > endTime.getTime()) return -1;
  }
  return -1;
}
