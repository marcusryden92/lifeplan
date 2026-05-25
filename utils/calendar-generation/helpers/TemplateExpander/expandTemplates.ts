import { EventTemplate, SimpleEvent } from "@/types/prisma";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { createRecurringTemplateEvent } from "./createRecurringTemplateEvent";

export function expandTemplates(
  userId: string,
  templates: EventTemplate[],
  startDate: Date,
  weekStartDay: WeekDayIntegers,
): { events: SimpleEvent[]; failureCount: number } {
  const events: SimpleEvent[] = [];
  let failureCount = 0;

  for (const template of templates) {
    const event = createRecurringTemplateEvent(
      userId,
      template,
      startDate,
      weekStartDay,
    );
    if (event) {
      events.push(event);
    } else {
      failureCount++;
    }
  }

  return { events, failureCount };
}
