import { EventTemplate } from "@/types/prisma";
import type { ValidationResult, ValidationError } from "../../core/CalendarValidator";
import { validateTemplate } from "./validateTemplate";

function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

function templatesOverlap(t1: EventTemplate, t2: EventTemplate): boolean {
  if (!t1.startTime || !t2.startTime) return false;

  const t1Start = timeToMinutes(t1.startTime);
  const t1End = t1Start + t1.duration;
  const t2Start = timeToMinutes(t2.startTime);
  const t2End = t2Start + t2.duration;

  return t1Start < t2End && t2Start < t1End;
}

function findTemplateConflicts(templates: EventTemplate[]): string[] {
  const conflicts: string[] = [];
  const byDay = new Map<number, EventTemplate[]>();

  for (const template of templates) {
    if (template.startDay === null || template.startDay === undefined) continue;
    const bucket = byDay.get(template.startDay) ?? [];
    bucket.push(template);
    byDay.set(template.startDay, bucket);
  }

  for (const [day, dayTemplates] of byDay) {
    for (let i = 0; i < dayTemplates.length; i++) {
      for (let j = i + 1; j < dayTemplates.length; j++) {
        if (templatesOverlap(dayTemplates[i], dayTemplates[j])) {
          conflicts.push(
            `Templates "${dayTemplates[i].title}" and "${dayTemplates[j].title}" overlap on day ${day}`
          );
        }
      }
    }
  }

  return conflicts;
}

export function validateTemplates(templates: EventTemplate[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: string[] = [];

  for (let i = 0; i < templates.length; i++) {
    const result = validateTemplate(templates[i]);
    if (!result.isValid) {
      result.errors.forEach((error) => {
        allErrors.push({
          ...error,
          field: `templates[${i}].${error.field}`,
        });
      });
    }
    allWarnings.push(...result.warnings);
  }

  const conflicts = findTemplateConflicts(templates);
  if (conflicts.length > 0) {
    allWarnings.push(...conflicts);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
