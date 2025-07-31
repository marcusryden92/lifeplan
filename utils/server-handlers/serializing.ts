import { Planner } from "@prisma/client";
import { SimpleEvent } from "@prisma/client";
import { EventTemplate } from "@/utils/templateBuilderUtils";
import { WeekDayType } from "@/types/calendarTypes";

export type SerializedPlanner = {
  title: string;
  id: string;
  parentId: string | null;
  type: "task" | "plan" | "goal" | null;
  isReady: boolean | null;
  duration: number | null;
  deadline: string | null;
  starts: string | null;
  dependency: string | null;
  completed: {
    startTime: string;
    endTime: string;
  } | null;
};

export type SerializedSimpleEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  rrule: string | null;
  duration: number | null;
  extendedProps: string; // JSON stringified object
};

export type SerializedEventTemplate = {
  id: string;
  title: string;
  startDay: WeekDayType;
  startTime: string; // "HH:mm"
  duration: number;
};

export function serializePlanner(planner: Planner) {
  return {
    title: planner.title,
    id: planner.id,
    parentId: planner.parentId ?? null,
    type: planner.type ?? null,
    isReady: planner.isReady ?? null,
    duration: planner.duration ?? null,
    deadline:
      planner.deadline instanceof Date ? planner.deadline.toISOString() : null,
    starts:
      planner.starts instanceof Date ? planner.starts.toISOString() : null,
    dependency: planner.dependency ?? null,
    completed: planner.completed
      ? {
          startTime: planner.completed.startTime,
          endTime: planner.completed.endTime,
        }
      : null,
  };
}

export function serializeSimpleEvent(
  event: SimpleEvent
): SerializedSimpleEvent {
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    rrule: event.rrule ? JSON.stringify(event.rrule) : null,
    duration: event.duration ?? null,
    extendedProps: JSON.stringify(event.extendedProps),
  };
}

export function serializeEventTemplate(
  template: EventTemplate
): SerializedEventTemplate {
  return {
    id: template.id,
    title: template.title,
    startDay: template.start.day,
    startTime: template.start.time,
    duration: template.duration,
  };
}
