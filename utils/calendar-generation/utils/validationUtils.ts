/**
 * Validation Utilities
 *
 * Comprehensive validation for calendar generation inputs
 */

import { Planner, EventTemplate, SimpleEvent } from "@/types/prisma";
import { TIME_CONSTANTS } from "../constants";

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export class CalendarValidator {
  /**
   * Validate a planner item
   */
  static validatePlanner(planner: Planner): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!planner.id) {
      errors.push({ field: "id", message: "Planner ID is required" });
    }

    if (!planner.title || planner.title.trim() === "") {
      errors.push({ field: "title", message: "Title is required" });
    }

    if (!planner.itemType) {
      errors.push({ field: "itemType", message: "Item type is required" });
    }

    if (!planner.userId) {
      errors.push({ field: "userId", message: "User ID is required" });
    }

    // Duration validation
    if (planner.duration === undefined || planner.duration === null) {
      errors.push({ field: "duration", message: "Duration is required" });
    } else if (planner.duration <= 0) {
      errors.push({
        field: "duration",
        message: "Duration must be positive",
        value: planner.duration,
      });
    } else if (planner.duration > TIME_CONSTANTS.MINUTES_PER_WEEK) {
      warnings.push(
        `Task "${planner.title}" duration (${planner.duration} min) exceeds one week`
      );
    }

    // Deadline validation
    if (planner.deadline) {
      const deadline = new Date(planner.deadline);
      if (isNaN(deadline.getTime())) {
        errors.push({
          field: "deadline",
          message: "Invalid deadline date",
          value: planner.deadline,
        });
      } else if (deadline < new Date()) {
        warnings.push(`Task "${planner.title}" has a deadline in the past`);
      }
    }

    // Priority validation
    if (planner.priority !== undefined && planner.priority < 0) {
      errors.push({
        field: "priority",
        message: "Priority cannot be negative",
        value: planner.priority,
      });
    }

    // Type-specific validation
    if (planner.itemType === "plan") {
      if (!planner.starts) {
        errors.push({
          field: "starts",
          message: "Plan items must have a start time",
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate an event template
   */
  static validateTemplate(template: EventTemplate): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!template.id) {
      errors.push({ field: "id", message: "Template ID is required" });
    }

    if (!template.title || template.title.trim() === "") {
      errors.push({ field: "title", message: "Title is required" });
    }

    if (!template.startDay) {
      errors.push({ field: "startDay", message: "Start day is required" });
    }

    if (!template.startTime) {
      errors.push({ field: "startTime", message: "Start time is required" });
    } else {
      // Validate time format (HH:MM)
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

  /**
   * Validate a batch of planners
   */
  static validatePlanners(planners: Planner[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: string[] = [];

    for (let i = 0; i < planners.length; i++) {
      const result = this.validatePlanner(planners[i]);
      if (!result.isValid) {
        result.errors.forEach((error) => {
          allErrors.push({
            ...error,
            field: `planners[${i}].${error.field}`,
          });
        });
      }
      allWarnings.push(...result.warnings);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * Validate a batch of templates
   */
  static validateTemplates(templates: EventTemplate[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: string[] = [];

    for (let i = 0; i < templates.length; i++) {
      const result = this.validateTemplate(templates[i]);
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

    // Check for template conflicts (overlapping times on same day)
    const conflicts = this.findTemplateConflicts(templates);
    if (conflicts.length > 0) {
      allWarnings.push(...conflicts);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * Find overlapping templates on the same day
   */
  private static findTemplateConflicts(templates: EventTemplate[]): string[] {
    const conflicts: string[] = [];
    const byDay: Record<string, EventTemplate[]> = {};

    // Group by day
    for (const template of templates) {
      if (!template.startDay) continue;
      if (!byDay[template.startDay]) {
        byDay[template.startDay] = [];
      }
      byDay[template.startDay].push(template);
    }

    // Check each day for overlaps
    for (const [day, dayTemplates] of Object.entries(byDay)) {
      for (let i = 0; i < dayTemplates.length; i++) {
        for (let j = i + 1; j < dayTemplates.length; j++) {
          if (this.templatesOverlap(dayTemplates[i], dayTemplates[j])) {
            conflicts.push(
              `Templates "${dayTemplates[i].title}" and "${dayTemplates[j].title}" overlap on ${day}`
            );
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two templates overlap
   */
  private static templatesOverlap(
    t1: EventTemplate,
    t2: EventTemplate
  ): boolean {
    if (!t1.startTime || !t2.startTime) return false;

    const t1Start = this.timeToMinutes(t1.startTime);
    const t1End = t1Start + t1.duration;
    const t2Start = this.timeToMinutes(t2.startTime);
    const t2End = t2Start + t2.duration;

    return t1Start < t2End && t2Start < t1End;
  }

  /**
   * Convert HH:MM to minutes since midnight
   */
  private static timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Validate calendar generation input
   */
  static validateGenerationInput(input: {
    userId?: string;
    weekStartDay?: number;
    templates?: EventTemplate[];
    planners?: Planner[];
    previousCalendar?: SimpleEvent[];
  }): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!input.userId) {
      errors.push({ field: "userId", message: "User ID is required" });
    }

    if (input.weekStartDay === undefined) {
      errors.push({
        field: "weekStartDay",
        message: "Week start day is required",
      });
    } else if (input.weekStartDay < 0 || input.weekStartDay > 6) {
      errors.push({
        field: "weekStartDay",
        message: "Week start day must be between 0 and 6",
        value: input.weekStartDay,
      });
    }

    if (input.templates) {
      const templateResult = this.validateTemplates(input.templates);
      errors.push(...templateResult.errors);
      warnings.push(...templateResult.warnings);
    }

    if (input.planners) {
      const plannerResult = this.validatePlanners(input.planners);
      errors.push(...plannerResult.errors);
      warnings.push(...plannerResult.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
