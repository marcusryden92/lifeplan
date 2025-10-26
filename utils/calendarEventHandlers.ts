import { SimpleEvent, Planner, EventTemplate } from "@/types/prisma";
import { DateSelectArg, EventDropArg } from "@fullcalendar/core/index.js";
import { EventResizeStartArg } from "@fullcalendar/interaction/index.js";
import { EventImpl } from "@fullcalendar/core/internal";
import { v4 as uuidv4 } from "uuid";
import React from "react";
import { getDuration } from "./calendarUtils";
import { getPlannerAndCalendarForCompletedTask } from "@/utils/taskHelpers";
import { deleteGoal } from "@/utils/goalPageHandlers";
import { assert } from "./assert/assert";

export const handleSelect = (
  userId: string | undefined,
  updatePlannerArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  selectInfo: DateSelectArg
) => {
  const { start, end } = selectInfo;
  const title = prompt("Enter event title:", "New Event");

  const now = new Date();
  const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

  if (userId && title) {
    const newEvent: Planner = {
      id: uuidv4(),
      title,
      parentId: null,
      itemType: "plan",
      isReady: true,
      duration,
      deadline: null,
      starts: start.toISOString(),
      dependency: null,
      completedStartTime: null,
      completedEndTime: null,
      userId,
      color: "black",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    updatePlannerArray((prevEvents) => [...prevEvents, newEvent]);
  }
};

export const handleEventResize = (
  updateAll: (
    planner?: Planner[] | ((prev: Planner[]) => Planner[]),
    calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
    template?: EventTemplate[] | ((prev: EventTemplate[]) => EventTemplate[])
  ) => void,
  resizeInfo: EventResizeStartArg
) => {
  const { event } = resizeInfo;

  assert(event, "Event undefined in handleEventResize");
  assert(event.start, "Event.start undefined in handleEventResize");
  assert(event.end, "Event.end undefined in handleEventResize");

  const start = event.start;
  const end = event.end;

  updateAll(
    (prevPlanner) =>
      prevPlanner.map((p) =>
        p.id === event.id ? { ...p, duration: getDuration(start, end) } : p
      ),
    (prevEvents) =>
      prevEvents.map((ev) =>
        ev.id === event.id
          ? {
              ...ev,
              start: event.start ? event.start.toISOString() : ev.start,
              end: event.end ? event.end.toISOString() : ev.end,
            }
          : ev
      )
  );
};

export const handleEventDrop = (
  updatePlannerArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  dropInfo: EventDropArg
) => {
  const { event } = dropInfo;

  updatePlannerArray((prevEvents) =>
    prevEvents.map((ev) =>
      ev.id === event.id
        ? {
            ...ev,
            starts: event.start?.toISOString() || ev.starts,
          }
        : ev
    )
  );
};

export const handleEventCopy = (
  event: EventImpl,
  updateAll: (
    planner?: Planner[] | ((prev: Planner[]) => Planner[]),
    calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
    template?: EventTemplate[] | ((prev: EventTemplate[]) => EventTemplate[])
  ) => void
) => {
  assert(event, "Event undefined in handleEventCopy");
  assert(event.start, "Event.start undefined in handleEventCopy");
  assert(event.end, "Event.end undefined in handleEventCopy");

  if (event.extendedProps.ItemType === "goal")
    throw new Error("Can't copy goal in handleEventCopy");

  const now = new Date().toISOString();

  updateAll((prevPlanner) => {
    const item = prevPlanner.find((p) => p.id === event.id);

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
    manuallyUpdatedCalendar?: SimpleEvent[]
  ) => void
) => {
  const updatedEvents = calendar?.map((calEvent) => {
    if (calEvent.id === taskId) {
      return { ...calEvent, title: title };
    }
    return calEvent;
  });

  if (updatedEvents) updateAll((prev) => prev, updatedEvents);

  updateAll((prev) =>
    prev.map((item) => {
      if (item.id === taskId) {
        return { ...item, title };
      }
      return item;
    })
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
    calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[])
  ) => void,
  green = "#0ebf7e"
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

    const updatedPlanner = planner.map((item) =>
      item.id === event.id
        ? { ...item, completedStartTime: null, completedEndTime: null }
        : item
    );

    updateAll(updatedPlanner);
  } else {
    setIsCompleted(true);
    setTimeout(() => {
      const result = getPlannerAndCalendarForCompletedTask(
        planner,
        calendar,
        event
      );
      if (result) {
        const { manuallyUpdatedTaskArray, manuallyUpdatedCalendar } = result;
        updateAll(
          (prev) => manuallyUpdatedTaskArray || prev,
          manuallyUpdatedCalendar
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
    calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[])
  ) => void
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
    calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[])
  ) => void,
  itemType: string,
  parentId: string | null,
  red = "#ef4444",
  setShowPopover?: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const element = elementRef.current;

  if (element) {
    element.style.backgroundColor = red;
    element.style.border = `solid 2px ${red}`;
  }

  const updatedCalendar = calendar?.filter((e) => e.id !== event?.id);

  setTimeout(() => {
    if (itemType === "goal") {
      deleteGoal({
        updateAll,
        taskId: event.id,
        parentId,
        manuallyUpdatedCalendar: updatedCalendar,
      });
    } else {
      updateAll((prev) => prev.filter((t) => t.id !== event.id));
    }
  }, 500);

  if (setShowPopover) setShowPopover(false);
};

export const handleDoubleClick = (
  e: React.MouseEvent,
  elementRef: React.RefObject<HTMLDivElement>,
  setEventRect: React.Dispatch<React.SetStateAction<DOMRect | null>>,
  setShowPopover: React.Dispatch<React.SetStateAction<boolean>>
) => {
  e.stopPropagation();

  if (elementRef.current) {
    setEventRect(elementRef.current.getBoundingClientRect());
    setShowPopover(true);
  }
};
