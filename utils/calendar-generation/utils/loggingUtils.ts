/**
 * Logging Utilities
 *
 * Centralized debug logging for calendar generation.
 */

import { SimpleEvent } from "@/types/prisma";
import { PerTemplateMask } from "../models/TemplateModels";
import {
  CalendarGenerationInput,
  LoggingConfig,
  SchedulingFailure,
  SchedulingMetrics,
} from "../models/SchedulingModels";
import { SchedulingStrategy } from "../strategies/SchedulingStrategy";
import type {
  SlotRecord,
  TravelPassRecorder,
} from "../helpers/TravelManager/TravelPassRecorder";

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
  travelPassRecorder?: TravelPassRecorder | null;
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
  | "leanCalendar"
  | "staticEventTravelPass";

/**
 * Check if a specific logging flag is enabled
 */
export function shouldLog(
  input: CalendarGenerationInput,
  flag: LogFlag,
): boolean {
  const config = input.config;
  if (!config?.enableLogging || !config?.logging) return false;
  return !!config.logging[flag];
}

/**
 * Filters events to those whose start falls within the configured log date
 * range. A null/undefined bound means "open on that side": only-start keeps
 * everything from that date onward; only-end keeps everything up to that
 * date; neither set is a no-op.
 */
export function filterEventsByLogRange<T extends { start: string | Date }>(
  events: T[],
  logging: LoggingConfig | undefined,
): T[] {
  const start = logging?.dateRangeStart ?? null;
  const end = logging?.dateRangeEnd ?? null;
  if (!start && !end) return events;
  return events.filter((e) => {
    const eventStart = new Date(e.start);
    if (start && eventStart < start) return false;
    if (end && eventStart > end) return false;
    return true;
  });
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
      type: e.extendedProps?.plannerType,
    })),
    eventTypes: eventArray.reduce(
      (acc, e) => {
        const type = e.extendedProps?.plannerType || "unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  });
}

export function logCalendarDebugInfo(
  input: CalendarGenerationInput,
  data: LoggingData,
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
        2,
      ),
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
        2,
      ),
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
    console.log(
      `  Recurring events generated: ${data.recurringTemplateEvents.length}`,
    );
    console.log(`  Per-template masks: ${data.perTemplateMasks.length}`);
    console.log(`  Largest template gap: ${data.largestTemplateGap} minutes`);
  }

  const logging = input.config?.logging;

  // Final events debug
  if (shouldLog(input, "finalEvents")) {
    console.log("FINAL EVENTS:");
    const filtered = filterEventsByLogRange(data.allEvents, logging);
    console.log(JSON.stringify(filtered, null, 2));
  }

  // Lean calendar debug (simplified view)
  if (shouldLog(input, "leanCalendar")) {
    console.log("LEAN CALENDAR:");
    const filtered = filterEventsByLogRange(data.allEvents, logging);
    const leanEvents = filtered.map((e) => ({
      title: e.title,
      id: e.id,
      start: e.start,
      end: e.end,
      type: e.extendedProps?.plannerType,
    }));
    console.log(JSON.stringify(leanEvents, null, 2));
  }

  // Travel debug
  if (shouldLog(input, "travelDebug")) {
    console.log("TRAVEL DEBUG:");
    const filtered = filterEventsByLogRange(data.travelEvents, logging);
    console.log(`  Travel events generated: ${filtered.length}`);
    if (filtered.length > 0) {
      console.log("  Travel events:");
      filtered.forEach((te) => {
        console.log(`    - ${te.title}: ${te.start} to ${te.end}`);
      });
    }
  }

  // Preliminary travel pass trail
  if (shouldLog(input, "staticEventTravelPass") && data.travelPassRecorder) {
    logstaticEventTravelPass(data.travelPassRecorder);
  }
}

/**
 * Pretty-print the per-slot decision/action trail captured by
 * TravelPassRecorder. Records are grouped by pass label so multiple
 * expandSlotsForNextWeek runs are visually separated.
 */
function logstaticEventTravelPass(recorder: TravelPassRecorder): void {
  const records = recorder.records;
  if (records.length === 0) {
    console.log("PRELIMINARY TRAVEL PASS: (no records in range)");
    return;
  }

  const byPass = new Map<string, SlotRecord[]>();
  for (const rec of records) {
    const list = byPass.get(rec.pass) ?? [];
    list.push(rec);
    byPass.set(rec.pass, list);
  }

  for (const [pass, passRecords] of byPass) {
    console.log(
      `\n=== PRELIMINARY TRAVEL PASS: ${pass} (${passRecords.length} slots) ===`,
    );
    for (const rec of passRecords) {
      const markers =
        rec.slot.markers.length > 0 ? ` {${rec.slot.markers.join(", ")}}` : "";
      console.log(
        `\n[iter ${rec.iterationIndex}] ${rec.slot.label}${markers}${rec.slot.id ? ` id=${rec.slot.id}` : ""}`,
      );
      for (const d of rec.decisions) {
        const indent = "  ".repeat(d.depth + 1);
        console.log(`${indent}${d.text}`);
      }
      for (const a of rec.actions) {
        console.log(`  → ${a}`);
      }
      if (rec.endState.length > 0) {
        console.log(`\n  End state (${rec.endState.length} slots in range):`);
        rec.endState.forEach((s, idx) => {
          const m = s.markers.length > 0 ? ` {${s.markers.join(", ")}}` : "";
          console.log(`    ${idx + 1}. ${s.label}${m}`);
        });
      }
    }
  }
}
