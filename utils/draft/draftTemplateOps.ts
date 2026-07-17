import { v4 as uuidv4 } from "uuid";
import type { DraftOpFailure } from "./draftForestOps";
import {
  type DraftTemplate,
  MAX_TEMPLATE_DURATION_MINUTES,
  isValidColor,
  isValidStartDay,
  isValidTime,
} from "./draftTemplates";

// Deterministic operations on the assistant's working template list, executed
// server-side like draftForestOps: the model states intent, code performs the
// mutation. Templates are a small flat list, so every op returns the full
// next array and the route emits it wholesale — no partial-tree events.
// Overlapping templates are allowed (the engine surfaces overlap as a
// warning); ops never reject on geometry.

export interface DraftTemplateOpsResult {
  templates: DraftTemplate[];
  changed: boolean;
  failures: DraftOpFailure[];
}

export interface DraftTemplateUpdate {
  id: string;
  title?: string;
  startDay?: number;
  startTime?: string;
  duration?: number;
  color?: string | null;
  locationId?: string | null;
}

export function addDraftTemplates(
  templates: DraftTemplate[],
  items: unknown[],
  validLocationIds: ReadonlySet<string>,
): DraftTemplateOpsResult {
  const next = [...templates];
  const failures: DraftOpFailure[] = [];
  let changed = false;

  for (const raw of Array.isArray(items) ? items : []) {
    if (typeof raw !== "object" || raw === null) {
      failures.push({ id: null, reason: "template must be an object" });
      continue;
    }
    const obj = raw as Record<string, unknown>;

    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    if (title.length === 0) {
      failures.push({ id: null, reason: "title must be non-empty" });
      continue;
    }
    if (!isValidStartDay(obj.startDay)) {
      failures.push({
        id: null,
        reason: `"${title}": startDay must be an integer 0-6 (0 = Sunday)`,
      });
      continue;
    }
    if (!isValidTime(obj.startTime)) {
      failures.push({
        id: null,
        reason: `"${title}": startTime must be "HH:MM" (24h)`,
      });
      continue;
    }
    const duration = validateDuration(obj.duration);
    if (duration === null) {
      failures.push({
        id: null,
        reason: `"${title}": duration must be minutes between 1 and ${MAX_TEMPLATE_DURATION_MINUTES}`,
      });
      continue;
    }
    const color = validateColor(obj.color);
    if (color === undefined) {
      failures.push({
        id: null,
        reason: `"${title}": color must be a 6-digit hex string or null`,
      });
      continue;
    }
    const locationId = validateLocationId(obj.locationId, validLocationIds);
    if (locationId === undefined) {
      failures.push({ id: null, reason: `"${title}": unknown locationId` });
      continue;
    }

    // New templates are new by definition — any model-supplied id is
    // discarded and a fresh draft id minted (it becomes the DB id at Save).
    next.push({
      id: uuidv4(),
      title,
      startDay: obj.startDay,
      startTime: obj.startTime,
      duration,
      color,
      locationId,
    });
    changed = true;
  }

  return { templates: next, changed, failures };
}

export function updateDraftTemplates(
  templates: DraftTemplate[],
  updates: DraftTemplateUpdate[],
  validLocationIds: ReadonlySet<string>,
): DraftTemplateOpsResult {
  const next = templates.map((t) => ({ ...t }));
  const failures: DraftOpFailure[] = [];
  let changed = false;

  for (const update of updates) {
    const id = typeof update.id === "string" ? update.id : "";
    const target = next.find((t) => t.id === id);
    if (!target) {
      failures.push({ id: id || null, reason: "template not found" });
      continue;
    }

    if (update.title !== undefined) {
      if (typeof update.title !== "string" || update.title.trim().length === 0) {
        failures.push({ id, reason: "title must be non-empty" });
        continue;
      }
      target.title = update.title.trim();
    }
    if (update.startDay !== undefined) {
      if (!isValidStartDay(update.startDay)) {
        failures.push({
          id,
          reason: "startDay must be an integer 0-6 (0 = Sunday)",
        });
        continue;
      }
      target.startDay = update.startDay;
    }
    if (update.startTime !== undefined) {
      if (!isValidTime(update.startTime)) {
        failures.push({ id, reason: 'startTime must be "HH:MM" (24h)' });
        continue;
      }
      target.startTime = update.startTime;
    }
    if (update.duration !== undefined) {
      const duration = validateDuration(update.duration);
      if (duration === null) {
        failures.push({
          id,
          reason: `duration must be minutes between 1 and ${MAX_TEMPLATE_DURATION_MINUTES}`,
        });
        continue;
      }
      target.duration = duration;
    }
    if (update.color !== undefined) {
      const color = validateColor(update.color);
      if (color === undefined) {
        failures.push({
          id,
          reason: "color must be a 6-digit hex string or null",
        });
        continue;
      }
      target.color = color;
    }
    if (update.locationId !== undefined) {
      const locationId = validateLocationId(update.locationId, validLocationIds);
      if (locationId === undefined) {
        failures.push({ id, reason: "unknown locationId" });
        continue;
      }
      target.locationId = locationId;
    }

    changed = true;
  }

  return { templates: next, changed, failures };
}

export function deleteDraftTemplates(
  templates: DraftTemplate[],
  templateIds: string[],
): DraftTemplateOpsResult {
  const ids = [...new Set(templateIds.filter((id) => typeof id === "string"))];
  const failures: DraftOpFailure[] = [];
  const present = new Set(templates.map((t) => t.id));

  for (const id of ids) {
    if (!present.has(id)) {
      failures.push({ id, reason: "template not found" });
    }
  }

  const remove = new Set(ids);
  const next = templates.filter((t) => !remove.has(t.id));
  return {
    templates: next,
    changed: next.length !== templates.length,
    failures,
  };
}

// Sub-minute values floor up to 1 (same coercion as updateDraftItems);
// anything past a full week is a model mistake, not a preference.
function validateDuration(value: unknown): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  const floored = Math.floor(value);
  if (floored > MAX_TEMPLATE_DURATION_MINUTES) return null;
  return Math.max(1, floored);
}

// undefined = invalid; string | null = accepted value.
function validateColor(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  return isValidColor(value) ? value : undefined;
}

function validateLocationId(
  value: unknown,
  validLocationIds: ReadonlySet<string>,
): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && validLocationIds.has(value)) return value;
  return undefined;
}
