import type { Category } from "@/types/prisma";
import { AvailableSlot, Slot } from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";
import { CategoryBoundaryTrespass } from "./categoryBoundaryTrespass";
import { expandSlotForDay } from "../TimeSlotManager/expandSlotForDay";

/* ============================================================================
 *  preliminaryTravelPass
 *
 *  Per slot:
 *    1. classify(...)  → Snapshot
 *         Gathers everything the dispatcher could possibly need: adjacency
 *         facts (prev/next neighbors in the unified slots view) and pre-
 *         computed feasibility plans (bypass, center, shift, extend). A plan
 *         is `null` if its action isn't feasible.
 *    2. pickActionKey(snap)  → key into processActions[direction][fit]
 *         Pure decision tree. Inspects the snapshot once and returns the
 *         exact key — no try-and-fall-through.
 *    3. processActions[direction][fit][key](snap, slots, trespasses)
 *         The chosen action runs. Each action is a small pipe over the
 *         step helpers (makeAvailableLeftover, makeTravel) plus a final
 *         `slots.splice(...)`.
 *
 *  Adding a new behavior: add a planner in classify, add a key/branch in
 *  pickActionKey, add the action function inside processActions.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

type Direction = "outbound" | "return";
type Fit = "smaller" | "exact" | "larger";

type NeighborInfo = {
  slot: Slot | null;
  exists: boolean;
  type: Slot["type"] | "none";
  contiguous: boolean;
  isCategory: boolean;
  isAvailable: boolean;
  isTravel: boolean;
  durationMs: number;
};

type CenterPlan = {
  travelStart: Date;
  travelEnd: Date;
  nextSlot: AvailableSlot;
};

type ShiftBackwardPlan = {
  newTravelStart: Date;
  newTravelEnd: Date;
  shrunkPreviousEnd: Date;
  previousSlot: AvailableSlot;
};

type ExtendForwardPlan = {
  travelEnd: Date;
  trimmedCategoryStart: Date;
  nextSlot: AvailableSlot;
};

type OutboundBypassPlan = {
  anchor: "end" | "start";
  spanEnd: Date;
  finalDestination: string;
  /** The category location we're bypassing (travel.nextLocation). */
  categoryLocation: string;
  directMinutes: number;
  /** false → direct travel can't fit the span; action marks insufficient. */
  fits: boolean;
  nextSlot: AvailableSlot;
};

type ReturnBypassPlan = {
  spanEnd: Date;
  finalDestination: string;
  directMinutes: number;
  fits: boolean;
  nextSlot: AvailableSlot;
};

type Snapshot = {
  slot: AvailableSlot;
  slotIndex: number;

  direction: Direction;
  prevLocation: string;
  nextLocation: string;
  travelMinutes: number;
  travelMs: number;
  slotMs: number;
  fit: Fit;

  currentIsCategory: boolean;
  bufferMs: number;
  bufferTimeMinutes: number;

  prev: NeighborInfo;
  next: NeighborInfo;

  // Feasibility plans — null when the corresponding action can't fire.
  outboundBypass: OutboundBypassPlan | null;
  returnBypass: ReturnBypassPlan | null;
  center: CenterPlan | null;
  shiftBackwardExact: ShiftBackwardPlan | null;
  shiftBackwardOverflow: ShiftBackwardPlan | null;
  extendForward: ExtendForwardPlan | null;
};

type ActionFn = (
  snap: Snapshot,
  slots: Slot[],
  trespasses: CategoryBoundaryTrespass[],
) => number;

// ---------------------------------------------------------------------------
//  Entry point
// ---------------------------------------------------------------------------

export function preliminaryTravelPass(
  hasPlannerLocationMap: boolean,
  categories: Category[],
  slots: Slot[],
  travelManager: TravelManager,
  bufferTimeMinutes: number,
  categoryBoundaryTrespasses: CategoryBoundaryTrespass[] = [],
): void {
  if (!hasPlannerLocationMap) return;
  const bufferMs = bufferTimeMinutes * 60000;
  let i = 0;
  while (i < slots.length) {
    const s = slots[i];
    if (s.type !== "available" || s.durationMinutes <= 0) {
      i++;
      continue;
    }
    const travel = travelManager.resolveTravel(s);
    if (!travel) {
      i++;
      continue;
    }
    const snap = classify(
      slots,
      i,
      s,
      travel,
      bufferMs,
      bufferTimeMinutes,
      travelManager,
      categories,
    );
    const bucket = processActions[snap.direction][snap.fit];
    const key = pickActionKey(snap);
    const action = bucket[key] ?? bucket.default;
    i += action(snap, slots, categoryBoundaryTrespasses);
  }
}

// ===========================================================================
//  processActions — indexed table of action functions.
//
//    processActions[direction][fit][key] → action function
//
//  Each key names a self-contained outcome ("bypass", "center", etc.).
//  Each action function is a pipe of step helpers (makeAvailableLeftover /
//  makeTravel) and a single splice.
// ===========================================================================

type ActionKey =
  | "bypass"
  | "center"
  | "shiftBackward"
  | "extendForward"
  | "trespass"
  | "default";

/**
 * Per (direction, fit) bucket: a partial map of action keys to functions.
 * Every bucket must define `default`; other keys are optional and only
 * present when that scenario can fire for that classification.
 */
type Bucket = Partial<Record<ActionKey, ActionFn>> & { default: ActionFn };

type ProcessActions = Record<Direction, Record<Fit, Bucket>>;

const processActions: ProcessActions = {
  outbound: {
    smaller: {
      bypass: doOutboundBypass,
      center: doCenter,
      default: doPlaceAtEnd,
    },
    exact: {
      bypass: doOutboundBypass,
      center: doCenter,
      shiftBackward: doShiftBackwardExact,
      trespass: doTrespassEnd,
      default: doPlaceAtEnd,
    },
    larger: {
      bypass: doOutboundBypass,
      center: doCenter,
      shiftBackward: doShiftBackwardOverflow,
      extendForward: doExtendForward,
      trespass: doTrespassEnd,
      default: doInsufficient,
    },
  },
  return: {
    smaller: {
      default: doPlaceAtStart,
    },
    exact: {
      bypass: doReturnBypass,
      trespass: doTrespassStart,
      default: doPlaceAtStart,
    },
    larger: {
      bypass: doReturnBypass,
      trespass: doTrespassStart,
      default: doPlaceAtStart,
    },
  },
};

/**
 * Pure decision tree. Given the fully-populated snapshot, returns the single
 * key in `processActions[direction][fit]` to invoke. No iteration over
 * candidates, no fall-through. Each branch reads from the snapshot.
 */
function pickActionKey(snap: Snapshot): ActionKey {
  if (snap.direction === "outbound") {
    if (snap.outboundBypass) return "bypass";
    if (snap.center) return "center";
    if (snap.fit === "smaller") return "default";
    if (snap.fit === "exact") {
      if (snap.shiftBackwardExact) return "shiftBackward";
      if (snap.currentIsCategory) return "trespass";
      return "default";
    }
    // fit === "larger"
    if (snap.shiftBackwardOverflow) return "shiftBackward";
    if (snap.extendForward) return "extendForward";
    if (snap.currentIsCategory) return "trespass";
    return "default";
  }
  // direction === "return"
  if (snap.returnBypass) return "bypass";
  if (snap.currentIsCategory && snap.travelMs >= snap.slotMs) return "trespass";
  return "default";
}

// ===========================================================================
//  CLASSIFY — gather facts and feasibility plans upfront.
// ===========================================================================

function classify(
  slots: Slot[],
  slotIndex: number,
  slot: AvailableSlot,
  travel: {
    prevLocation: string;
    nextLocation: string;
    travelMinutes: number;
    placeAtSlotStart: boolean;
  },
  bufferMs: number,
  bufferTimeMinutes: number,
  travelManager: TravelManager,
  categories: Category[],
): Snapshot {
  const direction: Direction = travel.placeAtSlotStart ? "return" : "outbound";
  const travelMs = Math.round(travel.travelMinutes * 60000);
  const slotMs = slot.end.getTime() - slot.start.getTime();
  const fit: Fit =
    travelMs < slotMs ? "smaller" : travelMs === slotMs ? "exact" : "larger";

  const prevSlot = slotIndex > 0 ? slots[slotIndex - 1] : null;
  const nextSlot = slotIndex < slots.length - 1 ? slots[slotIndex + 1] : null;

  const prev = probeNeighbor(prevSlot, slot.start.getTime(), "prev");
  const next = probeNeighbor(nextSlot, slot.end.getTime(), "next");

  const center =
    direction === "outbound" ? planCenter(slot, nextSlot, travel) : null;
  const shiftBackwardExact =
    direction === "outbound" && fit === "exact"
      ? planShiftBackward(slot, prevSlot, travel, bufferMs, true)
      : null;
  const shiftBackwardOverflow =
    direction === "outbound" && fit === "larger"
      ? planShiftBackward(slot, prevSlot, travel, bufferMs, false)
      : null;
  const extendForward =
    direction === "outbound" && fit === "larger"
      ? planExtendForward(slot, nextSlot, travel, bufferMs)
      : null;
  const outboundBypass =
    direction === "outbound"
      ? planOutboundBypass(
          slot,
          nextSlot,
          travel,
          bufferTimeMinutes,
          travelManager,
          categories,
        )
      : null;
  const returnBypass =
    direction === "return"
      ? planReturnBypass(slot, nextSlot, travel, travelManager)
      : null;

  return {
    slot,
    slotIndex,
    direction,
    prevLocation: travel.prevLocation,
    nextLocation: travel.nextLocation,
    travelMinutes: travel.travelMinutes,
    travelMs,
    slotMs,
    fit,
    currentIsCategory: !!slot.categoryId,
    bufferMs,
    bufferTimeMinutes,
    prev,
    next,
    outboundBypass,
    returnBypass,
    center,
    shiftBackwardExact,
    shiftBackwardOverflow,
    extendForward,
  };
}

function probeNeighbor(
  slot: Slot | null,
  anchorMs: number,
  side: "prev" | "next",
): NeighborInfo {
  if (!slot) {
    return {
      slot: null,
      exists: false,
      type: "none",
      contiguous: false,
      isCategory: false,
      isAvailable: false,
      isTravel: false,
      durationMs: 0,
    };
  }
  const contiguous =
    side === "prev"
      ? slot.end.getTime() === anchorMs
      : slot.start.getTime() === anchorMs;
  const hasCategoryField = slot.type === "available" || slot.type === "travel";
  return {
    slot,
    exists: true,
    type: slot.type,
    contiguous,
    isCategory: hasCategoryField && !!slot.categoryId,
    isAvailable: slot.type === "available",
    isTravel: slot.type === "travel",
    durationMs: slot.end.getTime() - slot.start.getTime(),
  };
}

// ---------------------------------------------------------------------------
//  Plan helpers — pure feasibility computations. null = not applicable.
// ---------------------------------------------------------------------------

function planCenter(
  slot: AvailableSlot,
  nextSlot: Slot | null,
  travel: { travelMinutes: number },
): CenterPlan | null {
  if (!slot.categoryId) return null;
  if (!nextSlot || nextSlot.type !== "available") return null;
  if (!nextSlot.categoryId) return null;
  if (nextSlot.start.getTime() !== slot.end.getTime()) return null;
  const halfMs = (travel.travelMinutes * 60000) / 2;
  const slotMs = slot.end.getTime() - slot.start.getTime();
  const nextSlotMs = nextSlot.end.getTime() - nextSlot.start.getTime();
  if (halfMs > slotMs || halfMs > nextSlotMs) return null;
  return {
    travelStart: new Date(slot.end.getTime() - halfMs),
    travelEnd: new Date(slot.end.getTime() + halfMs),
    nextSlot,
  };
}

function planShiftBackward(
  slot: AvailableSlot,
  prevSlot: Slot | null,
  travel: { travelMinutes: number },
  bufferMs: number,
  allowAcrossUnrelatedSlots: boolean,
): ShiftBackwardPlan | null {
  if (!prevSlot || prevSlot.type !== "available") return null;
  if (!allowAcrossUnrelatedSlots && prevSlot.categoryId) return null;

  const newTravelEnd = new Date(slot.end.getTime() - bufferMs);
  const newTravelStart = new Date(
    newTravelEnd.getTime() - travel.travelMinutes * 60000,
  );

  const adjacent =
    prevSlot.end.getTime() + bufferMs >= slot.start.getTime();
  const hasRoom = newTravelStart.getTime() >= prevSlot.start.getTime();
  if (!adjacent || !hasRoom) return null;

  // Last-resort path refuses when both sides are non-category.
  const bothNonCategory = !slot.categoryId && !prevSlot.categoryId;
  if (bothNonCategory && !allowAcrossUnrelatedSlots) return null;

  return {
    newTravelStart,
    newTravelEnd,
    shrunkPreviousEnd: new Date(newTravelStart.getTime() - bufferMs),
    previousSlot: prevSlot,
  };
}

function planExtendForward(
  slot: AvailableSlot,
  nextSlot: Slot | null,
  travel: { travelMinutes: number },
  bufferMs: number,
): ExtendForwardPlan | null {
  if (slot.categoryId) return null;
  if (!nextSlot || nextSlot.type !== "available") return null;
  if (!nextSlot.categoryId) return null;
  if (nextSlot.start.getTime() !== slot.end.getTime()) return null;
  const travelEnd = new Date(slot.start.getTime() + travel.travelMinutes * 60000);
  return {
    travelEnd,
    trimmedCategoryStart: new Date(travelEnd.getTime() + bufferMs),
    nextSlot,
  };
}

function planOutboundBypass(
  slot: AvailableSlot,
  nextSlot: Slot | null,
  travel: { prevLocation: string; nextLocation: string; travelMinutes: number },
  bufferTimeMinutes: number,
  travelManager: TravelManager,
  categories: Category[],
): OutboundBypassPlan | null {
  if (slot.categoryId) return null;
  if (!nextSlot || nextSlot.type !== "available" || !nextSlot.categoryId)
    return null;
  if (nextSlot.start.getTime() !== slot.end.getTime()) return null;
  if (!nextSlot.nextLocationId || nextSlot.nextLocationId === travel.nextLocation)
    return null;

  const periodEnd = findCategoryPeriodEnd(nextSlot, categories);
  if (periodEnd === undefined || nextSlot.end.getTime() >= periodEnd.getTime())
    return null;

  const finalDestination = nextSlot.nextLocationId;
  const travelCategoryToDestination = travelManager.getTravelTime(
    travel.nextLocation,
    finalDestination,
    nextSlot.end,
  );
  if (travelCategoryToDestination <= 0) return null;

  const categorySlotCannotHoldOutgoing =
    travelCategoryToDestination > nextSlot.durationMinutes;
  const combinedSpanCannotHoldBoth =
    travel.travelMinutes + bufferTimeMinutes + travelCategoryToDestination >
    slot.durationMinutes + nextSlot.durationMinutes;
  if (!categorySlotCannotHoldOutgoing && !combinedSpanCannotHoldBoth)
    return null;

  // Anchor depends on which trigger fired.
  //   category slot too small  → span END (preserves leftover before)
  //   combined span too tight  → span START (trims category slot after)
  const anchor: "end" | "start" = categorySlotCannotHoldOutgoing
    ? "end"
    : "start";
  const anchorTime = anchor === "end" ? nextSlot.end : slot.start;
  const directMinutes = travelManager.getTravelTime(
    travel.prevLocation,
    finalDestination,
    anchorTime,
  );

  const spanMs = nextSlot.end.getTime() - slot.start.getTime();
  const fits = directMinutes * 60000 <= spanMs;

  return {
    anchor,
    spanEnd: nextSlot.end,
    finalDestination,
    categoryLocation: travel.nextLocation,
    directMinutes,
    fits,
    nextSlot,
  };
}

function planReturnBypass(
  slot: AvailableSlot,
  nextSlot: Slot | null,
  travel: { prevLocation: string; nextLocation: string; travelMinutes: number },
  travelManager: TravelManager,
): ReturnBypassPlan | null {
  if (!slot.categoryId) return null;
  if (travel.travelMinutes < slot.durationMinutes) return null;
  if (!nextSlot || nextSlot.type !== "available" || nextSlot.categoryId)
    return null;
  if (nextSlot.start.getTime() !== slot.end.getTime()) return null;
  if (
    nextSlot.prevLocationId !== travel.nextLocation ||
    !nextSlot.nextLocationId
  )
    return null;

  const finalDestination = nextSlot.nextLocationId;
  const directMinutes = travelManager.getTravelTime(
    travel.prevLocation,
    finalDestination,
    slot.start,
  );
  if (directMinutes <= 0) return null;

  const spanMs = nextSlot.end.getTime() - slot.start.getTime();
  const fits = directMinutes * 60000 <= spanMs;

  return {
    spanEnd: nextSlot.end,
    finalDestination,
    directMinutes,
    fits,
    nextSlot,
  };
}

function findCategoryPeriodEnd(
  slot: AvailableSlot,
  constraints: Category[],
): Date | undefined {
  if (!slot.categoryId) return undefined;
  const constraint = constraints.find((c) => c.id === slot.categoryId);
  if (!constraint) return undefined;
  const dayStart = new Date(slot.start);
  dayStart.setHours(0, 0, 0, 0);
  const slotStartMs = slot.start.getTime();
  const slotEndMs = slot.end.getTime();
  for (const cts of constraint.timeSlots) {
    const period = expandSlotForDay(cts, dayStart);
    if (!period) continue;
    if (
      period.start.getTime() <= slotStartMs &&
      period.end.getTime() >= slotEndMs
    ) {
      return period.end;
    }
  }
  return undefined;
}

// ===========================================================================
//  Step helpers — small building blocks reused by action functions.
// ===========================================================================

function makeAvailableLeftover(
  start: Date,
  end: Date,
  base: AvailableSlot,
  overrides: {
    prevLocationId?: string | null;
    nextLocationId?: string | null;
    categoryId?: string | null;
    isStrictCategory?: boolean;
  } = {},
): AvailableSlot {
  return {
    start,
    end,
    durationMinutes: Math.floor((end.getTime() - start.getTime()) / 60000),
    type: "available",
    prevLocationId:
      overrides.prevLocationId !== undefined
        ? overrides.prevLocationId
        : base.prevLocationId,
    nextLocationId:
      overrides.nextLocationId !== undefined
        ? overrides.nextLocationId
        : base.nextLocationId,
    categoryId:
      overrides.categoryId !== undefined
        ? overrides.categoryId
        : base.categoryId,
    isStrictCategory:
      overrides.isStrictCategory !== undefined
        ? overrides.isStrictCategory
        : base.isStrictCategory,
  };
}

function makeTravel(
  start: Date,
  end: Date,
  fromLoc: string,
  toLoc: string,
  snap: Snapshot,
  opts?: { insufficient?: boolean; requiredMinutes?: number },
) {
  return createTravelSlot(start, end, fromLoc, toLoc, "preliminary", uuidv4(), {
    categoryId: snap.slot.categoryId,
    isStrictCategory: snap.slot.isStrictCategory,
    insufficientTravel: opts?.insufficient ?? false,
    requiredTravelMinutes: opts?.requiredMinutes ?? 0,
  });
}

// ===========================================================================
//  Action functions — each is a "custom pipe" of step helpers + a splice.
// ===========================================================================

function doPlaceAtEnd(snap: Snapshot, slots: Slot[]): number {
  const { slot, slotIndex, prevLocation, nextLocation, travelMinutes } = snap;
  const travelStart = new Date(slot.end.getTime() - travelMinutes * 60000);
  const pieces: Slot[] = [];
  if (travelStart.getTime() > slot.start.getTime()) {
    pieces.push(
      makeAvailableLeftover(slot.start, travelStart, slot, {
        nextLocationId: nextLocation,
      }),
    );
  }
  pieces.push(makeTravel(travelStart, slot.end, prevLocation, nextLocation, snap));
  slots.splice(slotIndex, 1, ...pieces);
  return pieces.length;
}

function doPlaceAtStart(snap: Snapshot, slots: Slot[]): number {
  // Falls through to insufficient when travel can't fit.
  if (snap.travelMs > snap.slotMs) return doInsufficient(snap, slots);

  const { slot, slotIndex, prevLocation, nextLocation, travelMinutes } = snap;
  const travelEnd = new Date(slot.start.getTime() + travelMinutes * 60000);
  const pieces: Slot[] = [
    makeTravel(slot.start, travelEnd, prevLocation, nextLocation, snap),
  ];
  if (travelEnd.getTime() < slot.end.getTime()) {
    pieces.push(
      makeAvailableLeftover(travelEnd, slot.end, slot, {
        prevLocationId: nextLocation,
      }),
    );
  }
  slots.splice(slotIndex, 1, ...pieces);
  return pieces.length;
}

function doCenter(snap: Snapshot, slots: Slot[]): number {
  const plan = snap.center!;
  const { slot, slotIndex, prevLocation, nextLocation } = snap;
  const { travelStart, travelEnd, nextSlot } = plan;
  const pieces: Slot[] = [];
  if (travelStart.getTime() > slot.start.getTime()) {
    pieces.push(
      makeAvailableLeftover(slot.start, travelStart, slot, {
        nextLocationId: prevLocation,
      }),
    );
  }
  pieces.push(makeTravel(travelStart, travelEnd, prevLocation, nextLocation, snap));
  pieces.push({
    ...nextSlot,
    start: travelEnd,
    durationMinutes: Math.floor(
      (nextSlot.end.getTime() - travelEnd.getTime()) / 60000,
    ),
    prevLocationId: nextLocation,
  });
  slots.splice(slotIndex, 2, ...pieces);
  // Stop on the trimmed-next so the walker re-classifies it.
  return pieces.length - 1;
}

function doShiftBackwardExact(snap: Snapshot, slots: Slot[]): number {
  return applyShiftBackward(snap, slots, snap.shiftBackwardExact!);
}

function doShiftBackwardOverflow(snap: Snapshot, slots: Slot[]): number {
  return applyShiftBackward(snap, slots, snap.shiftBackwardOverflow!);
}

function applyShiftBackward(
  snap: Snapshot,
  slots: Slot[],
  plan: ShiftBackwardPlan,
): number {
  const { slotIndex, prevLocation, nextLocation } = snap;
  const { newTravelStart, newTravelEnd, shrunkPreviousEnd, previousSlot } = plan;
  const pieces: Slot[] = [];
  if (shrunkPreviousEnd.getTime() > previousSlot.start.getTime()) {
    pieces.push({
      ...previousSlot,
      end: shrunkPreviousEnd,
      durationMinutes: Math.floor(
        (shrunkPreviousEnd.getTime() - previousSlot.start.getTime()) / 60000,
      ),
    });
  }
  pieces.push(
    makeTravel(newTravelStart, newTravelEnd, prevLocation, nextLocation, snap),
  );
  // Splice [prev, current] with pieces. K items inserted, splice at i-1.
  slots.splice(slotIndex - 1, 2, ...pieces);
  return pieces.length - 1;
}

function doExtendForward(snap: Snapshot, slots: Slot[]): number {
  const plan = snap.extendForward!;
  const { slot, slotIndex, prevLocation, nextLocation } = snap;
  const { travelEnd, trimmedCategoryStart, nextSlot } = plan;
  const pieces: Slot[] = [
    makeTravel(slot.start, travelEnd, prevLocation, nextLocation, snap),
  ];
  if (trimmedCategoryStart.getTime() < nextSlot.end.getTime()) {
    pieces.push({
      ...nextSlot,
      start: trimmedCategoryStart,
      durationMinutes: Math.floor(
        (nextSlot.end.getTime() - trimmedCategoryStart.getTime()) / 60000,
      ),
      prevLocationId: nextLocation,
    });
  }
  slots.splice(slotIndex, 2, ...pieces);
  return pieces.length;
}

function doOutboundBypass(snap: Snapshot, slots: Slot[]): number {
  const plan = snap.outboundBypass!;
  const { slot, slotIndex, prevLocation } = snap;
  const { anchor, spanEnd, finalDestination, categoryLocation, directMinutes, fits, nextSlot } = plan;

  if (!fits) {
    slots.splice(
      slotIndex,
      2,
      makeTravel(slot.start, spanEnd, prevLocation, finalDestination, snap, {
        insufficient: true,
        requiredMinutes: directMinutes,
      }),
    );
    return 1;
  }

  if (anchor === "end") {
    const travelStart = new Date(spanEnd.getTime() - directMinutes * 60000);
    const pieces: Slot[] = [];
    if (travelStart.getTime() > slot.start.getTime()) {
      pieces.push(
        makeAvailableLeftover(slot.start, travelStart, slot, {
          nextLocationId: finalDestination,
        }),
      );
    }
    pieces.push(
      makeTravel(travelStart, spanEnd, prevLocation, finalDestination, snap),
    );
    slots.splice(slotIndex, 2, ...pieces);
    return pieces.length;
  }

  // anchor === "start" — trim what remains of the category slot.
  const travelEnd = new Date(slot.start.getTime() + directMinutes * 60000);
  const pieces: Slot[] = [
    makeTravel(slot.start, travelEnd, prevLocation, finalDestination, snap),
  ];
  if (travelEnd.getTime() < spanEnd.getTime()) {
    pieces.push({
      ...nextSlot,
      start: travelEnd,
      durationMinutes: Math.floor(
        (spanEnd.getTime() - travelEnd.getTime()) / 60000,
      ),
      prevLocationId: categoryLocation,
    });
    slots.splice(slotIndex, 2, ...pieces);
    return pieces.length - 1;
  }
  slots.splice(slotIndex, 2, ...pieces);
  return pieces.length;
}

function doReturnBypass(snap: Snapshot, slots: Slot[]): number {
  const plan = snap.returnBypass!;
  const { slot, slotIndex, prevLocation } = snap;
  const { spanEnd, finalDestination, directMinutes, fits, nextSlot } = plan;

  if (!fits) {
    slots.splice(
      slotIndex,
      2,
      makeTravel(slot.start, spanEnd, prevLocation, finalDestination, snap, {
        insufficient: true,
        requiredMinutes: directMinutes,
      }),
    );
    return 1;
  }

  const travelEnd = new Date(slot.start.getTime() + directMinutes * 60000);
  const pieces: Slot[] = [
    makeTravel(slot.start, travelEnd, prevLocation, finalDestination, snap),
  ];
  if (travelEnd.getTime() < spanEnd.getTime()) {
    pieces.push({
      start: travelEnd,
      end: spanEnd,
      durationMinutes: Math.floor(
        (spanEnd.getTime() - travelEnd.getTime()) / 60000,
      ),
      type: "available",
      prevLocationId: finalDestination,
      nextLocationId: nextSlot.nextLocationId,
      categoryId: null,
      isStrictCategory: false,
    });
  }
  slots.splice(slotIndex, 2, ...pieces);
  return pieces.length;
}

function doTrespassEnd(
  snap: Snapshot,
  _slots: Slot[],
  trespasses: CategoryBoundaryTrespass[],
): number {
  trespasses.push({
    categoryId: snap.slot.categoryId!,
    slotStart: snap.slot.start,
    slotEnd: snap.slot.end,
    boundary: "end",
  });
  return 1;
}

function doTrespassStart(
  snap: Snapshot,
  _slots: Slot[],
  trespasses: CategoryBoundaryTrespass[],
): number {
  trespasses.push({
    categoryId: snap.slot.categoryId!,
    slotStart: snap.slot.start,
    slotEnd: snap.slot.end,
    boundary: "start",
  });
  return 1;
}

function doInsufficient(snap: Snapshot, slots: Slot[]): number {
  const { slot, slotIndex, prevLocation, nextLocation, travelMinutes } = snap;
  slots.splice(
    slotIndex,
    1,
    makeTravel(slot.start, slot.end, prevLocation, nextLocation, snap, {
      insufficient: true,
      requiredMinutes: travelMinutes,
    }),
  );
  return 1;
}
