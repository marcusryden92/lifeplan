/**
 * renderEngineMessage
 *
 * Adapts a structured EngineMessage (with typed payload) into the
 * presentation-level shape the calendar engine console renders. Kept
 * separate from the engine's emit code so:
 *   - Titles/bodies stay derived from current entity state (a rename
 *     doesn't leave a stale title on a persisted message).
 *   - A future action layer can hang off `type` + payload without
 *     re-parsing prose.
 */

import type { Planner, EngineMessage } from "@/types/prisma";
import type { SerializedLocation } from "@/redux/slices/schedulingSettingsSlice";
import type {
  EngineMessagePayload,
  EngineMessageTone,
} from "./calendar-generation/models/EngineMessage";
import { SchedulingFailureReason } from "./calendar-generation/constants";

export type RenderedEngineMessage = {
  id: string;
  tag: string;
  tone: EngineMessageTone;
  title: string;
  body: string;
  // ISO datetime when the card references a specific placement the calendar
  // can jump to; null for types without a concrete date (recurring travel
  // patterns, unplaced tasks, aggregate summaries).
  goToDate: string | null;
};

export type EngineMessageLookups = {
  plannerById: Map<string, Planner>;
  locationById: Map<string, SerializedLocation>;
};

export function buildEngineMessageLookups(
  planners: Planner[],
  locations: SerializedLocation[],
): EngineMessageLookups {
  return {
    plannerById: new Map(planners.map((p) => [p.id, p])),
    locationById: new Map(locations.map((l) => [l.id, l])),
  };
}

export function renderEngineMessage(
  message: EngineMessage,
  lookups: EngineMessageLookups,
): RenderedEngineMessage | null {
  // payload is Prisma.JsonValue in the DB. Guard the JSON shape first, then
  // narrow via the discriminant. An unknown or malformed shape (e.g. row
  // written by a newer client) returns null so the caller filters rather
  // than crashes.
  const raw = message.payload as unknown;
  if (!raw || typeof raw !== "object" || !("type" in raw)) return null;
  const knownTypes: readonly EngineMessagePayload["type"][] = [
    "TASK_TOO_LARGE",
    "TASK_UNSCHEDULABLE",
    "SCHEDULED_LATE",
    "INSUFFICIENT_TRAVEL",
    "SPLIT_CONSTRAINT_RELAXED",
    "GOAL_DAY_CAP_RELAXED",
    "SCHEDULED_OK",
  ];
  const rawType = (raw as { type: unknown }).type;
  if (
    typeof rawType !== "string" ||
    !knownTypes.includes(rawType as EngineMessagePayload["type"])
  ) {
    return null;
  }
  const payload = raw as EngineMessagePayload;
  const tone = message.tone as EngineMessageTone;

  switch (payload.type) {
    case "TASK_TOO_LARGE": {
      const planner = lookups.plannerById.get(payload.plannerId);
      const title = planner
        ? `Couldn't place: "${planner.title}"`
        : `Couldn't place task`;
      const body = `Needs ${formatMinutes(payload.duration)}. Largest available gap is ${formatMinutes(payload.maxCapacity)} given current templates and category constraints.`;
      return {
        id: message.id,
        tag: "TOO LARGE",
        tone,
        title,
        body,
        goToDate: null,
      };
    }

    case "TASK_UNSCHEDULABLE": {
      const planner = lookups.plannerById.get(payload.plannerId);
      const isPartial =
        typeof payload.remainingMinutes === "number" &&
        payload.remainingMinutes > 0;
      const title = planner
        ? isPartial
          ? `Couldn't fully place: "${planner.title}"`
          : `Couldn't place: "${planner.title}"`
        : `Couldn't place task`;
      const partialNote = isPartial
        ? ` ${formatMinutes(payload.remainingMinutes!)} still unplaced${
            typeof payload.placedMinutes === "number" &&
            payload.placedMinutes > 0
              ? ` (${formatMinutes(payload.placedMinutes)} placed)`
              : ""
          }.`
        : "";
      return {
        id: message.id,
        tag: "UNPLACED",
        tone,
        title,
        body: `${unschedulableBody(payload.reason)}${partialNote}`,
        goToDate: null,
      };
    }

    case "SCHEDULED_LATE": {
      const planner = lookups.plannerById.get(payload.plannerId);
      const label = planner?.title ?? "Task";
      const title = `"${label}" scheduled ${payload.daysLate} day${payload.daysLate === 1 ? "" : "s"} after deadline`;
      const scheduledLabel = formatDateLabel(payload.scheduledStart);
      const dueLabel = formatDateLabel(payload.deadline);
      const body = `Scheduled ${scheduledLabel}. Deadline was ${dueLabel}.`;
      return {
        id: message.id,
        tag: "LATE",
        tone,
        title,
        body,
        goToDate: payload.scheduledStart,
      };
    }

    case "INSUFFICIENT_TRAVEL": {
      const from = locationLabel(payload.fromLocationId, lookups);
      const to = locationLabel(payload.toLocationId, lookups);
      const dayLabel = weekdayLabel(payload.dayOfWeek);
      const title = `Insufficient travel · ${from} → ${to} · ${dayLabel} ${payload.timeOfDay}`;
      const scale =
        payload.affectedCount > 1
          ? ` Recurs ${payload.affectedCount}× in the horizon.`
          : "";
      const body = `Short by ${formatMinutes(payload.shortageMinutes)} (placed ${formatMinutes(payload.actualMinutes)}, needs ${formatMinutes(payload.requiredMinutes)}).${scale}`;
      return {
        id: message.id,
        tag: "TRAVEL",
        tone,
        title,
        body,
        goToDate: null,
      };
    }

    case "SPLIT_CONSTRAINT_RELAXED": {
      const planner = lookups.plannerById.get(payload.plannerId);
      const label = planner?.title ?? "Split task";
      const chunkLabel =
        payload.affectedCount === 1
          ? "one chunk"
          : `${payload.affectedCount} chunks`;
      const body =
        payload.kind === "maxChunk"
          ? `The remainder couldn't be divided without going below the minimum chunk size, so ${chunkLabel} (${formatMinutes(payload.totalMinutes)}) exceeds the maximum chunk size.`
          : `There wasn't room within the daily limit, so ${chunkLabel} (${formatMinutes(payload.totalMinutes)}) was placed past it rather than dropped.`;
      return {
        id: message.id,
        tag: "SPLIT",
        tone,
        title: `"${label}" placed with a compromise`,
        body,
        goToDate: null,
      };
    }

    case "GOAL_DAY_CAP_RELAXED": {
      const planner = lookups.plannerById.get(payload.plannerId);
      const label = planner?.title ?? "Goal";
      const blockLabel =
        payload.affectedCount === 1
          ? "one work block"
          : `${payload.affectedCount} work blocks`;
      const body =
        payload.kind === "oversizedLeaf"
          ? `A single work block needs more than the ${formatMinutes(payload.capMinutes)}/day limit, so ${blockLabel} (${formatMinutes(payload.totalMinutes)}) was placed whole.`
          : `There wasn't room within the ${formatMinutes(payload.capMinutes)}/day limit before the horizon ran out, so ${blockLabel} (${formatMinutes(payload.totalMinutes)}) was placed past it rather than dropped.`;
      return {
        id: message.id,
        tag: "DAILY LIMIT",
        tone,
        title: `"${label}" placed over its daily limit`,
        body,
        goToDate: null,
      };
    }

    case "SCHEDULED_OK": {
      const label = payload.placedCount === 1 ? "item" : "items";
      const title = `${payload.placedCount} ${label} successfully scheduled!`;
      const body = `All candidates placed given current templates and constraints.`;
      return {
        id: message.id,
        tag: "OK",
        tone,
        title,
        body,
        goToDate: null,
      };
    }

    default:
      // Unknown payload type — persisted row from a version we don't know
      // how to render. Return null; the caller drops it silently. Better to
      // omit than to throw on a payload shape we can't reason about.
      return null;
  }
}

/**
 * Extract a plannerId from a persisted payload if the shape carries one.
 * Used by the console to link a card to the referenced planner without the
 * caller knowing every payload variant.
 */
export function plannerIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { plannerId?: unknown };
  return typeof p.plannerId === "string" ? p.plannerId : null;
}

function locationLabel(
  id: string | null,
  lookups: EngineMessageLookups,
): string {
  if (!id) return "Anywhere";
  return lookups.locationById.get(id)?.name ?? "Unknown";
}

// Prose lives with the renderer, not the engine's SchedulingFailure — the
// scheduler emits structured facts (reason enum), the UI owns copy.
function unschedulableBody(reason: SchedulingFailureReason): string {
  switch (reason) {
    case SchedulingFailureReason.NO_SLOTS:
      return "No available time slots within the search horizon.";
    case SchedulingFailureReason.ITERATION_LIMIT:
      return "Scheduling gave up after too many attempts.";
    case SchedulingFailureReason.DEPENDENCY_CONFLICT:
      return "Blocked by another task's placement.";
    case SchedulingFailureReason.INVALID_TASK:
      return "Task data is invalid — missing duration or required fields.";
    case SchedulingFailureReason.TEMPLATE_ERROR:
      return "Template expansion failed.";
    case SchedulingFailureReason.TOO_LARGE:
      // TOO_LARGE has its own message type; falling into this branch means
      // an emit path miscategorized. Surface generically rather than throw.
      return "Task is too large for any available gap.";
  }
}

function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function weekdayLabel(day: number): string {
  return WEEKDAY_LABELS[day] ?? "?";
}
