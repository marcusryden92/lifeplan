import { SimpleEvent, EventType } from "@/types/prisma";
import { RuntimeEventExtendedProps } from "@/types/ui";
import { CategoryBoundaryTrespass } from "../TravelManager/categoryBoundaryTrespass";

/**
 * Stamps category wrapper events with red top/bottom borders when the travel
 * pass recorded a trespass at one of their boundaries (i.e. the travel into
 * or out of the wrapper would have consumed the whole period).
 *
 * Each marker is matched to the wrapper whose period CONTAINS the trespassing
 * slot. When a wrapper is marked, any adjacent wrapper sharing that boundary
 * timestamp is also marked on its opposite border — so both sides of a
 * too-tight category-to-category transition render red, mirroring the
 * existing `markTrespassingEvents` behaviour for overlapping plan items.
 */
export function markCategoryBoundaryTrespasses(
  events: SimpleEvent[],
  trespasses: CategoryBoundaryTrespass[],
): void {
  if (trespasses.length === 0) return;

  const wrapperIndices: number[] = [];
  for (let i = 0; i < events.length; i++) {
    if (events[i].extendedProps?.eventType === EventType.category) {
      wrapperIndices.push(i);
    }
  }
  if (wrapperIndices.length === 0) return;

  for (const trespass of trespasses) {
    const containingIndex = findContainingWrapperIndex(
      events,
      wrapperIndices,
      trespass,
    );
    if (containingIndex === -1) continue;

    stampBorder(events, containingIndex, trespass.boundary);

    // Also stamp the adjacent wrapper on the opposite border if one starts/
    // ends at exactly the same instant. Mirrors how markTrespassingEvents
    // marks both sides of an overlapping pair.
    const containingEvent = events[containingIndex];
    const boundaryTimestamp =
      trespass.boundary === "end"
        ? new Date(containingEvent.end).getTime()
        : new Date(containingEvent.start).getTime();

    const adjacentIndex = findAdjacentWrapperIndex(
      events,
      wrapperIndices,
      containingIndex,
      boundaryTimestamp,
      trespass.boundary,
    );
    if (adjacentIndex !== -1) {
      stampBorder(
        events,
        adjacentIndex,
        trespass.boundary === "end" ? "start" : "end",
      );
    }
  }
}

function findContainingWrapperIndex(
  events: SimpleEvent[],
  wrapperIndices: number[],
  trespass: CategoryBoundaryTrespass,
): number {
  const slotStartMs = trespass.slotStart.getTime();
  const slotEndMs = trespass.slotEnd.getTime();

  for (const i of wrapperIndices) {
    const wrapper = events[i];
    const wrapperCategoryId = (
      wrapper.extendedProps as RuntimeEventExtendedProps | undefined
    )?.categoryId;
    if (wrapperCategoryId !== trespass.categoryId) continue;
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
