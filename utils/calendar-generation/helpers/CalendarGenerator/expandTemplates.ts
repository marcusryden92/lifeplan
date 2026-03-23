/**
 * Template Expansion
 *
 * Expands recurring template definitions into concrete time blocks
 */

import { EventTemplate, SimpleEvent } from "@/types/prisma";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { TemplateExpander } from "../../core/TemplateExpander";
import { PerTemplateMask } from "../../models/TemplateModels";
import { dateTimeService } from "../../utils/dateTimeService";
import { SchedulingMetrics } from "../../models/SchedulingModels";

export function expandTemplates(
  userId: string,
  eventArray: SimpleEvent[],
  templates: EventTemplate[],
  weekStartDay: WeekDayIntegers,
  currentDate: Date,
  maxDaysAhead: number,
  enableLogging: boolean,
  metrics: SchedulingMetrics
): {
  filteredEvents: SimpleEvent[];
  recurringTemplateEvents: SimpleEvent[];
  perTemplateMasks: PerTemplateMask[];
  largestTemplateGap: number;
  updatedMetrics: SchedulingMetrics;
} {
  const templateExpander = new TemplateExpander(weekStartDay);

  const templateStart = performance.now();
  const weekStart = dateTimeService.getWeekFirstDate(currentDate, weekStartDay);
  const searchEndDate = dateTimeService.shiftDays(weekStart, maxDaysAhead);

  const recurringTemplateEvents = templateExpander.expandTemplates(
    userId,
    templates,
    weekStart,
    searchEndDate
  );

  // Debug logging
  if (enableLogging) {
    console.log("Templates expanded:", recurringTemplateEvents.length);
    if (recurringTemplateEvents.length > 0) {
      const workHourTemplates = recurringTemplateEvents.filter((t) => {
        const start = new Date(t.start);
        const hour = start.getHours();
        return hour >= 9 && hour < 17;
      });
      console.log(
        `Templates in work hours (9am-5pm): ${workHourTemplates.length}/${recurringTemplateEvents.length}`
      );
    }
  }

  // Build per-template masks
  const perTemplateMasks = templateExpander.getPerTemplateMasks(templates);

  if (enableLogging) {
    console.log("Template masks:", {
      count: perTemplateMasks.length,
      masks: perTemplateMasks.map((m) => ({
        templateTitle: templates.find((t) => t.id === m.templateId)?.title,
        occurrences: m.occurrences.map((occ) => ({
          day: occ.day,
          times: occ.times.map((t) => ({
            startTime: t.startTime,
            endTime: t.endTime,
          })),
        })),
      })),
    });
  }

  const templateEnd = performance.now();
  const largestTemplateGap = templateExpander.calculateLargestGap(templates);

  const filteredEvents = eventArray.filter(
    (e) => e.extendedProps?.itemType !== "template",
  );
  filteredEvents.push(...recurringTemplateEvents);

  return {
    filteredEvents,
    recurringTemplateEvents,
    perTemplateMasks,
    largestTemplateGap,
    updatedMetrics: {
      ...metrics,
      templateExpansionTimeMs: templateEnd - templateStart,
      templateEventsGenerated: recurringTemplateEvents.length,
      templatesFailed: templateExpander.getTemplateFailureCount(),
    },
  };
}
