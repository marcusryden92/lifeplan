import { EventTemplate } from "@/types/prisma";
import { TIME_CONSTANTS } from "../../constants";
import type { ValidationResult, ValidationError } from "../../core/CalendarValidator";

export function validateTemplate(template: EventTemplate): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (!template.id) {
    errors.push({ field: "id", message: "Template ID is required" });
  }

  if (!template.title || template.title.trim() === "") {
    errors.push({ field: "title", message: "Title is required" });
  }

  if (template.startDay === null || template.startDay === undefined) {
    errors.push({ field: "startDay", message: "Start day is required" });
  }

  if (!template.startTime) {
    errors.push({ field: "startTime", message: "Start time is required" });
  } else {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(template.startTime)) {
      errors.push({
        field: "startTime",
        message: "Invalid time format (expected HH:MM)",
        value: template.startTime,
      });
    }
  }

  if (template.duration === undefined || template.duration === null) {
    errors.push({ field: "duration", message: "Duration is required" });
  } else if (template.duration <= 0) {
    errors.push({
      field: "duration",
      message: "Duration must be positive",
      value: template.duration,
    });
  } else if (template.duration > TIME_CONSTANTS.MINUTES_PER_DAY) {
    warnings.push(
      `Template "${template.title}" duration (${template.duration} min) exceeds one day`
    );
  }

  if (!template.userId) {
    errors.push({ field: "userId", message: "User ID is required" });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
