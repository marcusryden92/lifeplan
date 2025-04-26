import { RRule } from "@/types/calendarTypes";

// Assuming EventImpl looks like this (you can modify according to your actual structure)
interface EventImpl {
  id: string;
  title: string;
  start: Date | string | null; // This might be a Date or a string
  end: Date | string | null; // This might be a Date or a string
  backgroundColor?: string;
  borderColor?: string;
  rrule?: RRule;
  duration?: number;
}

export type SimpleEvent = {
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  backgroundColor?: string;
  borderColor?: string;
  rrule?: RRule;
  duration?: number;
  extendedProps: { isTemplateItem: boolean };
};

export const convertEventImplToSimpleEvent = (
  event: EventImpl,
  isTemplate: boolean
): SimpleEvent => {
  if (!event.start) {
    throw new Error("event.start is null");
  } else if (!event.end) throw new Error("event.end is null");

  // Ensure start and end are converted to ISO strings
  const start =
    event.start instanceof Date
      ? event.start.toISOString()
      : new Date(event.start).toISOString();
  const end =
    event.end instanceof Date
      ? event.end.toISOString()
      : new Date(event.end).toISOString();

  return {
    id: event.id,
    title: event.title,
    start, // Convert start to ISO string if it's a Date or string
    end, // Convert end to ISO string if it's a Date or string
    backgroundColor: event.backgroundColor,
    borderColor: event.borderColor,
    rrule: event.rrule,
    duration: event.duration,
    extendedProps: { isTemplateItem: isTemplate }, // Add extendedProps
  };
};
