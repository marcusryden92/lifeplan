import { SimpleEvent, EventType } from "@/types/prisma";
import { RuntimeEventExtendedProps } from "@/types/ui";
import { CategorySlot, Slot } from "../../models/TimeSlot";

/**
 * Stamps category wrapper events with red top/bottom borders when the travel
 * pass marked a CategorySlot fragment as boundary-trespassed (i.e. the travel
 * into or out of the wrapper would have consumed the slot's interior).
 *
 * Trespass markers live directly on the CategorySlot fragments
 * (trespassingStart / trespassingEnd) — no side-channel. This function scans
 * the slots array for fragments with either flag set, matches each to the
 * wrapper whose period CONTAINS the fragment, and stamps the appropriate
 * border. If an adjacent wrapper shares the boundary timestamp, its opposite
 * border is also stamped — mirroring markTrespassingEvents for overlapping
 * plan items.
 */
export function markCategoryBoundaryTrespasses(
  events: SimpleEvent[],
  slots: Slot[],
): void {
  const wrapperIndices: number[] = [];
  for (let i = 0; i < events.length; i++) {
    if (events[i].extendedProps?.eventType === EventType.category) {
      wrapperIndices.push(i);
    }
  }
  if (wrapperIndices.length === 0) return;

  for (const slot of slots) {
    if (slot.type === "category") {
      if (slot.trespassingStart) {
        stampMatchingWrappers(events, wrapperIndices, slot, "start");
      }
      if (slot.trespassingEnd) {
        stampMatchingWrappers(events, wrapperIndices, slot, "end");
      }
      continue;
    }

    if (slot.type === "travel" && slot.consumedCategoryIds?.length) {
      // Travel slot consumed (fully or partially) some category interiors.
      // Only stamp wrappers when the travel failed to fit (insufficient,
      // red) — the boundary stamps communicate "this cat was violated."
      // Overconstrained travels are intentional overrides; the travel slot's
      // own styling already communicates that, so stamping the underlying
      // wrappers would just add visual noise on top of cats that the travel
      // is already covering.
      if (!slot.insufficientTravel) continue;
      for (const categoryId of slot.consumedCategoryIds) {
        stampWrappersByCategoryId(
          events,
          wrapperIndices,
          categoryId,
          slot.start,
          slot.end,
        );
      }
    }
  }
}

function stampWrappersByCategoryId(
  events: SimpleEvent[],
  wrapperIndices: number[],
  categoryId: string,
  travelStart: Date,
  travelEnd: Date,
): void {
  const travelStartMs = travelStart.getTime();
  const travelEndMs = travelEnd.getTime();

  for (const i of wrapperIndices) {
    const wrapper = events[i];
    const wrapperCategoryId = (
      wrapper.extendedProps as RuntimeEventExtendedProps | undefined
    )?.categoryId;
    if (wrapperCategoryId !== categoryId) continue;
    const wrapperStartMs = new Date(wrapper.start).getTime();
    const wrapperEndMs = new Date(wrapper.end).getTime();

    // Stamp a boundary only when the travel's time range actually crosses
    // that boundary. A travel landing in the middle of a wrapper consumes
    // neither edge; a travel that begins before wrapper.start (or earlier)
    // and ends within or past it consumes the start; symmetric logic for
    // the end.
    if (travelStartMs <= wrapperStartMs && travelEndMs > wrapperStartMs) {
      stampBorder(events, i, "start");
    }
    if (travelStartMs < wrapperEndMs && travelEndMs >= wrapperEndMs) {
      stampBorder(events, i, "end");
    }
  }
}

function stampMatchingWrappers(
  events: SimpleEvent[],
  wrapperIndices: number[],
  slot: CategorySlot,
  boundary: "start" | "end",
): void {
  const containingIndex = findContainingWrapperIndex(
    events,
    wrapperIndices,
    slot,
  );
  if (containingIndex === -1) return;

  stampBorder(events, containingIndex, boundary);

  const containingEvent = events[containingIndex];
  const boundaryTimestamp =
    boundary === "end"
      ? new Date(containingEvent.end).getTime()
      : new Date(containingEvent.start).getTime();

  const adjacentIndex = findAdjacentWrapperIndex(
    events,
    wrapperIndices,
    containingIndex,
    boundaryTimestamp,
    boundary,
  );
  if (adjacentIndex !== -1) {
    stampBorder(
      events,
      adjacentIndex,
      boundary === "end" ? "start" : "end",
    );
  }
}

function findContainingWrapperIndex(
  events: SimpleEvent[],
  wrapperIndices: number[],
  slot: CategorySlot,
): number {
  const slotStartMs = slot.start.getTime();
  const slotEndMs = slot.end.getTime();

  for (const i of wrapperIndices) {
    const wrapper = events[i];
    const wrapperCategoryId = (
      wrapper.extendedProps as RuntimeEventExtendedProps | undefined
    )?.categoryId;
    if (wrapperCategoryId !== slot.categoryId) continue;
    const wrapperStartMs = new Date(wrapper.start).getTime();
    const wrapperEndMs = new Date(wrapper.end).getTime();
    if (wrapperStartMs <= slotStartMs && wrapperEndMs >= slotEndMs) {
      return i;
    }
  }
  return -1;
}

function findAdjacentWrapperIndex(
  events: SimpleEvent[],
  wrapperIndices: number[],
  containingIndex: number,
  boundaryTimestamp: number,
  trespassBoundary: "start" | "end",
): number {
  for (const i of wrapperIndices) {
    if (i === containingIndex) continue;
    const wrapper = events[i];
    const sideMs =
      trespassBoundary === "end"
        ? new Date(wrapper.start).getTime() // adjacent wrapper STARTS here
        : new Date(wrapper.end).getTime(); // adjacent wrapper ENDS here
    if (sideMs === boundaryTimestamp) return i;
  }
  return -1;
}

function stampBorder(
  events: SimpleEvent[],
  index: number,
  boundary: "start" | "end",
): void {
  const event = events[index];
  if (!event.extendedProps) return;

  const updatedProps: RuntimeEventExtendedProps = {
    ...event.extendedProps,
    trespassingStart:
      boundary === "start"
        ? true
        : (event.extendedProps as RuntimeEventExtendedProps).trespassingStart,
    trespassingEnd:
      boundary === "end"
        ? true
        : (event.extendedProps as RuntimeEventExtendedProps).trespassingEnd,
  };

  events[index] = { ...event, extendedProps: updatedProps };
}
