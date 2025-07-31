import { Planner } from "@/lib/plannerClass";
import { ExtendedPropsType, RRule } from "@/types/calendarTypes";
import { CalendarColor } from "@/data/calendarColors";

import { Planner as PlannerModel, WeekDayType } from "@prisma/client";
import { SimpleEvent } from "@/types/calendarTypes";
import { EventTemplate } from "@/utils/templateBuilderUtils";

import { fetchCalendarData } from "@/actions/calendar-actions/fetchCalendarData";
import { safeParse } from "@/utils/generalUtils";

export interface TransformedCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  rrule: string | null;
  duration?: number | null;
  extendedProps: string;
}

export interface TransformedEventTemplate {
  id: string;
  title: string;
  startDay: string;
  startTime: string;
  duration: number;
}

// Transform planner items
export function transformPlannerItems(mainPlanner: PlannerModel[]): Planner[] {
  return mainPlanner.map((item) => ({
    id: item.id,
    title: item.title,
    parentId: item.parentId || undefined,
    type: item.type || null,
    isReady: item.isReady || undefined,
    duration: item.duration || undefined,
    deadline: item.deadline ? new Date(item.deadline) : undefined,
    starts: item.starts ? new Date(item.starts) : undefined,
    dependency: item.dependency || undefined,
    completed:
      item.completedStartTime && item.completedEndTime
        ? {
            startTime: item.completedStartTime,
            endTime: item.completedEndTime,
          }
        : undefined,
    color: safeParse<CalendarColor>(item.color),
  }));
}

// Transform calendar events
export function transformCalendarEvents(
  calendarEvents: TransformedCalendarEvent[]
): SimpleEvent[] {
  return calendarEvents.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    rrule: safeParse<RRule>(event.rrule),
    duration: event.duration ?? undefined,
    extendedProps: safeParse<ExtendedPropsType>(event.extendedProps),
  }));
}

// Transform event templates
export function transformEventTemplates(
  templatesItems: TransformedEventTemplate[]
): EventTemplate[] {
  return templatesItems.map((template) => ({
    title: template.title,
    id: template.id,
    start: {
      day: template.startDay as WeekDayType,
      time: template.startTime,
    },
    duration: template.duration,
  }));
}

// Combined transformation
export async function transformFetchedData(userId: string): Promise<{
  planner: Planner[];
  calendar: SimpleEvent[];
  template: EventTemplate[];
} | null> {
  const response = await fetchCalendarData(userId);

  if (!response.data) return null;

  const { planner, calendar, template } = response.data;

  const plannerItems = transformPlannerItems(planner);
  const calendarEvents = transformCalendarEvents(calendar);
  const templates = transformEventTemplates(template);

  return {
    planner: plannerItems,
    calendar: calendarEvents,
    template: templates,
  };
}
