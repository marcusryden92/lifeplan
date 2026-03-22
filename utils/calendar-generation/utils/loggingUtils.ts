/**
 * Logging Utilities
 *
 * Centralized debug logging for calendar generation.
 */

import { SimpleEvent } from "@/types/prisma";
import { PerTemplateMask } from "./intervalUtils";
import {
  CalendarGenerationInput,
  SchedulingFailure,
  SchedulingMetrics,
} from "../models/SchedulingModels";
import { SchedulingStrategy } from "../strategies/SchedulingStrategy";

export interface LoggingData {
  allEvents: SimpleEvent[];
  travelEvents: SimpleEvent[];
  recurringTemplateEvents: SimpleEvent[];
  perTemplateMasks: PerTemplateMask[];
  largestTemplateGap: number;
  plannerLocationMap: Map<string, string | null>;
  strategies: Array<{ strategy: SchedulingStrategy; weight: number }>;
  schedulingResult: {
    success: boolean;
    newEvents: SimpleEvent[];
    failures: SchedulingFailure[];
  };
  metrics: SchedulingMetrics;
}

type LogFlag =
  | "metrics"
  | "failures"
  | "finalEvents"
  | "travelDebug"
  | "templateInfo"
  | "planners"
  | "templates"
  | "locations"
  | "strategySettings"
  | "leanCalendar";

/**
 * Check if a specific logging flag is enabled
 */
export function shouldLog(input: CalendarGenerationInput, flag: LogFlag): boolean {
  const config = input.config;
  if (!config?.enableLogging || !config?.logging) return false;
  return !!config.logging[flag];
}

/**
 * Handle all debug logging for calendar generation
 */
export function logInitialSlotContext(eventArray: SimpleEvent[]): void {
  const workHourEvents = eventArray.filter((e) => {
    const hour = new Date(e.start).getHours();
    return hour >= 9 && hour < 17;
  });

  console.log("Building slots from events:", {
    totalEvents: eventArray.length,
    workHourEvents: workHourEvents.length,
    workHourDetails: workHourEvents.slice(0, 5).map((e) => ({
      title: e.title,
      start: new Date(e.start).toLocaleTimeString(),
      end: new Date(e.end).toLocaleTimeString(),
      type: e.extendedProps?.itemType,
    })),
    eventTypes: eventArray.reduce(
      (acc, e) => {
        const type = e.extendedProps?.itemType || "unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  });
}

export function logCalendarDebugInfo(
  input: CalendarGenerationInput,
  data: LoggingData
): void {
  // Planners debug
  if (shouldLog(input, "planners")) {
    console.log("INPUT PLANNERS:");
    console.log(JSON.stringify(input.planners, null, 2));
  }

  // Templates debug
  if (shouldLog(input, "templates")) {
    console.log("INPUT TEMPLATES:");
    console.log(JSON.stringify(input.templates, null, 2));
  }

  // Locations debug
  if (shouldLog(input, "locations")) {
    console.log("PLANNER LOCATION MAP:");
    console.log(
      JSON.stringify(
        Object.fromEntries(data.plannerLocationMap.entries()),
        null,
        2
      )
    );
  }

  // Strategy settings debug
  if (shouldLog(input, "strategySettings")) {
    console.log("STRATEGY SETTINGS:");
    console.log(
      JSON.stringify(
        data.strategies.map((s) => ({
          name: s.strategy.name,
          weight: s.weight,
        })),
        null,
        2
      )
    );
  }

  // Metrics debug
  if (shouldLog(input, "metrics")) {
    console.log("SCHEDULING METRICS:");
    console.log(JSON.stringify(data.metrics, null, 2));
  }

  // Failures debug
  if (shouldLog(input, "failures")) {
    console.log("SCHEDULING FAILURES:");
    console.log(JSON.stringify(data.schedulingResult.failures, null, 2));
  }

  // Template info debug
  if (shouldLog(input, "templateInfo")) {
    console.log("TEMPLATE INFO:");
    console.log(`  Recurring events generated: ${data.recurringTemplateEvents.length}`);
    console.log(`  Per-template masks: ${data.perTemplateMasks.length}`);
    console.log(`  Largest template gap: ${data.largestTemplateGap} minutes`);
  }

  // Final events debug
  if (shouldLog(input, "finalEvents")) {
    console.log("FINAL EVENTS:");
    console.log(JSON.stringify(data.allEvents, null, 2));
  }

  // Lean calendar debug (simplified view)
  if (shouldLog(input, "leanCalendar")) {
    console.log("LEAN CALENDAR:");
    const leanEvents = data.allEvents.map((e) => ({
      title: e.title,
      start: e.start,
      end: e.end,
      type: e.extendedProps?.itemType,
    }));
    console.log(JSON.stringify(leanEvents, null, 2));
  }

  // Travel debug
  if (shouldLog(input, "travelDebug")) {
    console.log("TRAVEL DEBUG:");
    console.log(`  Travel events generated: ${data.travelEvents.length}`);
    if (data.travelEvents.length > 0) {
      console.log("  Travel events:");
      data.travelEvents.forEach((te) => {
        console.log(`    - ${te.title}: ${te.start} to ${te.end}`);
      });
    }
  }
}
