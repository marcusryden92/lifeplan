import {
  SimpleEvent,
  Planner,
  EventTemplate,
  PlannerType,
  Category,
} from "@/types/prisma";
import { EventDropArg } from "@fullcalendar/core/index.js";
import { EventResizeStartArg } from "@fullcalendar/interaction/index.js";
import { EventImpl } from "@fullcalendar/core/internal";
import { v4 as uuidv4 } from "uuid";
import React from "react";
import { getDuration } from "./calendarUtils";
import { getPlannerAndCalendarForCompletedTask } from "@/utils/taskHelpers";
import { deleteGoal } from "@/utils/goalPageHandlers";
import { assert } from "./assert/assert";
import {
  parseRecurrenceExceptions,
  serializeRecurrenceExceptions,
  shiftRecurrenceExceptions,
  upsertDeletedException,
  upsertMovedException,
  plannerIdFromEventId,
} from "./planRecurrence";

export const createPlanFromSelection = (
  userId: string | undefined,
  updatePlannerArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  start: Date,
  end: Date,
  title: string,
) => {
  if (!userId || !title) return;
  const now = new Date();
  const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

  const newEvent: Planner = {
    id: uuidv4(),
    title,
    parentId: null,
    plannerType: PlannerType.plan,
    isReady: true,
    isTriaged: true,
    duration,
    deadline: null,
    starts: start.toISOString(),
    recurrence: null,
    recurrenceExceptions: null,
    sortOrder: 0,
    priority: 5,
    completedStartTime: null,
    completedEndTime: null,
    userId,
    color: "black",
    locationId: null,
    useParentLocation: false,
    categoryId: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  updatePlannerArray((prevEvents) => [...prevEvents, newEvent]);
};

// Calendar drag/resize run the engine inline: FullCalendar has already moved
// the tile internally, so an async regen would paint it overlapping stale
// placements for a frame ("half-width popping"). Inline commits source +
// engine output before the next paint — same atomicity the synchronous
// engine had.
export const handleEventResize = (
  updateAll: (
    planner?: Planner[] | ((prev: Planner[]) => Planner[]),
    calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
    template?: EventTemplate[] | ((prev: EventTemplate[]) => EventTemplate[]),
    categories?: Category[] | ((prev: Category[]) => Category[]),
    options?: { engineMode?: "inline" | "worker" },
  ) => void,
  resizeInfo: EventResizeStartArg,
) => {
  const { event } = resizeInfo;

  assert(event, "Event undefined in handleEventResize");
  assert(event.start, "Event.start undefined in handleEventResize");
  assert(event.end, "Event.end undefined in handleEventResize");

  const start = event.start;
  const end = event.end;

  // Occurrence events resolve to their plan row; resizing one occurrence
  // resizes the series (duration lives on the planner).
  const plannerId = plannerIdFromEventId(event.id);

  updateAll(
    (prevPlanner) =>
      prevPlanner.map((p) =>
        p.id === plannerId ? { ...p, duration: getDuration(start, end) } : p,
      ),
    (prevEvents) =>
      prevEvents.map((ev) =>
        ev.id === event.id
          ? {
              ...ev,
              start: event.start ? event.start.toISOString() : ev.start,
              end: event.end ? event.end.toISOString() : ev.end,
            }
          : ev,
      ),
    undefined,
    undefined,
    { engineMode: "inline" },
  );
};

export const handleEventDrop = (
  updatePlannerArray: (
    planner: Planner[] | ((prev: Planner[]) => Planner[]),
    options?: { engineMode?: "inline" | "worker" },
  ) => void,
  dropInfo: EventDropArg,
) => {
  const { event } = dropInfo;
  console.debug("[calendar] eventDrop", event.id, event.start?.toISOString());

  updatePlannerArray(
    (prevPlanner) => {
      if (!prevPlanner.some((p) => p.id === event.id)) {
        console.warn("[calendar] eventDrop matched no planner row", event.id);
        return prevPlanner;
      }
      return prevPlanner.map((ev) =>
        ev.id === event.id
          ? {
              ...ev,
              starts: event.start?.toISOString() || ev.starts,
            }
          : ev,
      );
    },
    { engineMode: "inline" },
  );
};

type UpdatePlannerArrayFn = (
  planner: Planner[] | ((prev: Planner[]) => Planner[]),
  options?: { engineMode?: "inline" | "worker" },
) => void;

type UpdateAllFn = (
  planner?: Planner[] | ((prev: Planner[]) => Planner[]),
  calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
  template?: EventTemplate[] | ((prev: EventTemplate[]) => EventTemplate[]),
  categories?: Category[] | ((prev: Category[]) => Category[]),
  options?: { engineMode?: "inline" | "worker" },
) => void;

// "Move just this occurrence": a moved exception keyed by the occurrence's
// original rule position. Re-moving the same occurrence updates the entry.
export const applyOccurrenceMove = (
  updatePlannerArray: UpdatePlannerArrayFn,
  planId: string,
  occurrenceKey: string,
  newStart: Date,
) => {
  updatePlannerArray(
    (prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              recurrenceExceptions: serializeRecurrenceExceptions(
                upsertMovedException(
                  parseRecurrenceExceptions(p.recurrenceExceptions),
                  occurrenceKey,
                  newStart.toISOString(),
                ),
              ),
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    { engineMode: "inline" },
  );
};

// "Move every occurrence": shift the series anchor by the drag delta.
// Exception keys derive from the anchor, so they shift by the same delta.
export const applySeriesMove = (
  updatePlannerArray: UpdatePlannerArrayFn,
  planId: string,
  deltaMs: number,
) => {
  updatePlannerArray(
    (prev) =>
      prev.map((p) =>
        p.id === planId && p.starts
          ? {
              ...p,
              starts: new Date(
                new Date(p.starts).getTime() + deltaMs,
              ).toISOString(),
              recurrenceExceptions: serializeRecurrenceExceptions(
                shiftRecurrenceExceptions(
                  parseRecurrenceExceptions(p.recurrenceExceptions),
                  deltaMs,
                ),
              ),
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    { engineMode: "inline" },
  );
};

// "Delete just this occurrence": a deleted exception; the calendar row is
// filtered optimistically so the tile disappears before the regen confirms.
export const applyOccurrenceDelete = (
  updateAll: UpdateAllFn,
  planId: string,
  occurrenceKey: string,
  occurrenceEventId: string,
) => {
  updateAll(
    (prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              recurrenceExceptions: serializeRecurrenceExceptions(
                upsertDeletedException(
                  parseRecurrenceExceptions(p.recurrenceExceptions),
                  occurrenceKey,
                ),
              ),
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    (prev) => prev.filter((e) => e.id !== occurrenceEventId),
  );
};

// "Delete every occurrence": remove the plan row and all of its occurrence
// events (their ids share the plan-id prefix).
export const applySeriesDelete = (updateAll: UpdateAllFn, planId: string) => {
  updateAll(
    (prev) => prev.filter((p) => p.id !== planId),
    (prev) => prev.filter((e) => plannerIdFromEventId(e.id) !== planId),
  );
};

export const handleEventCopy = (
  event: EventImpl,
  updateAll: (
    planner?: Planner[] | ((prev: Planner[]) => Planner[]),
    calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
    template?: EventTemplate[] | ((prev: EventTemplate[]) => EventTemplate[]),
  ) => void,
) => {
  assert(event, "Event undefined in handleEventCopy");
  assert(event.start, "Event.start undefined in handleEventCopy");
  assert(event.end, "Event.end undefined in handleEventCopy");

  if (event.extendedProps.PlannerType === "goal")
    throw new Error("Can't copy goal in handleEventCopy");

  const now = new Date().toISOString();

  updateAll((prevPlanner) => {
    const item = prevPlanner.find(
      (p) => p.id === plannerIdFromEventId(event.id),
    );

    return item
      ? [
          ...prevPlanner,
          {
            ...item,
            id: uuidv4(),
            completedStartTime: null,
            completedEndTime: null,
            createdAt: now,
            updatedAt: now,
          },
        ]
      : prevPlanner;
  });
};

export const handleUpdateTitle = (
  title: string,
  setTitle: React.Dispatch<React.SetStateAction<string>>,
  taskId: string,
  calendar: SimpleEvent[],
  updateAll: (
    arg: Planner[] | ((prev: Planner[]) => Planner[]),
    manuallyUpdatedCalendar?: SimpleEvent[],
  ) => void,
) => {
  const plannerId = plannerIdFromEventId(taskId);
  const updatedEvents = calendar?.map((calEvent) => {
    if (plannerIdFromEventId(calEvent.id) === plannerId) {
      return { ...calEvent, title: title };
    }
    return calEvent;
  });

  if (updatedEvents) updateAll((prev) => prev, updatedEvents);

  updateAll((prev) =>
    prev.map((item) => {
      if (item.id === plannerId) {
        return { ...item, title };
      }
      return item;
    }),
  );

  setTitle(title);
};

export const handleClickCompleteTask = (
  event: EventImpl,
  isCompleted: boolean,
  setIsCompleted: React.Dispatch<React.SetStateAction<boolean>>,
  elementRef: React.RefObject<HTMLDivElement>,
  planner: Planner[],
  calendar: SimpleEvent[],
  updateAll: (
    planner?: Planner[] | ((prev: Planner[]) => Planner[]),
    calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
  ) => void,
  green = "#0ebf7e",
) => {
  const element = elementRef.current;
  if (!event || !element) return;

  const color = !isCompleted
    ? green
    : (event.extendedProps.backgroundColor as string);

  if (element && color) {
    element.style.backgroundColor = color;
  }

  if (isCompleted) {
    setIsCompleted(false);

    // Remove the event from the calendar and clear completed times
    // This allows it to be rescheduled by the calendar generator
    updateAll(
      (prev) =>
        prev.map((item) =>
          item.id === event.id
            ? { ...item, completedStartTime: null, completedEndTime: null }
            : item,
        ),
      (prev) => prev.filter((e) => e.id !== event.id),
    );
  } else {
    setIsCompleted(true);
    setTimeout(() => {
      const result = getPlannerAndCalendarForCompletedTask(
        planner,
        calendar,
        event,
      );
      if (result) {
        const { manuallyUpdatedTaskArray, manuallyUpdatedCalendar } = result;
        updateAll(
          (prev) => manuallyUpdatedTaskArray || prev,
          manuallyUpdatedCalendar,
        );
      }
    }, 500);
  }
};

export const handlePostponeTask = (
  event: EventImpl,
  calendar: SimpleEvent[],
  updateAll: (
    planner?: Planner[] | ((prev: Planner[]) => Planner[]),
    calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
  ) => void,
) => {
  const updatedCalendar = calendar?.filter((e) => e.id !== event.id);
  if (updatedCalendar) updateAll((prev) => prev, updatedCalendar);
};

export const handleClickDelete = (
  event: EventImpl,
  elementRef: React.RefObject<HTMLDivElement>,
  calendar: SimpleEvent[],
  updateAll: (
    planner?: Planner[] | ((prev: Planner[]) => Planner[]),
    calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
  ) => void,
  plannerType: string,
  parentId: string | null,
  red = "#ef4444",
  setShowPopover?: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  const element = elementRef.current;

  if (element) {
    element.style.backgroundColor = red;
    element.style.border = `solid 2px ${red}`;
  }

  const updatedCalendar = calendar?.filter((e) => e.id !== event?.id);

  setTimeout(() => {
    if (plannerType === PlannerType.goal) {
      deleteGoal({
        updateAll,
        taskId: event.id,
        manuallyUpdatedCalendar: updatedCalendar,
      });
    } else {
      updateAll(
        (prev) => prev.filter((t) => t.id !== event.id),
        (prev) => prev.filter((t) => t.id !== event.id),
      );
    }
  }, 500);

  if (setShowPopover) setShowPopover(false);
};

export const handleDoubleClick = (
  e: React.MouseEvent,
  elementRef: React.RefObject<HTMLDivElement>,
  setEventRect: React.Dispatch<React.SetStateAction<DOMRect | null>>,
  setShowPopover: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  e.stopPropagation();

  if (elementRef.current) {
    setEventRect(elementRef.current.getBoundingClientRect());
    setShowPopover(true);
  }
};
