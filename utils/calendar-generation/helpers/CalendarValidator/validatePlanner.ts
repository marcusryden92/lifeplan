import { Planner } from "@/types/prisma";
import { TIME_CONSTANTS } from "../../constants";
import type { ValidationResult, ValidationError } from "../../core/CalendarValidator";

export function validatePlanner(planner: Planner): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

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

  if (planner.itemType !== "goal") {
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
  } else {
    if (
      typeof planner.duration === "number" &&
      planner.duration > TIME_CONSTANTS.MINUTES_PER_WEEK
    ) {
      warnings.push(
        `Goal "${planner.title}" duration (${planner.duration} min) exceeds one week`
      );
    }
  }

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

  if (planner.priority !== undefined && planner.priority < 0) {
    errors.push({
      field: "priority",
      message: "Priority cannot be negative",
      value: planner.priority,
    });
  }

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
