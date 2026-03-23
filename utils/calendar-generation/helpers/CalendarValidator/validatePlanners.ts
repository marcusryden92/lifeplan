import { Planner } from "@/types/prisma";
import type { ValidationResult, ValidationError } from "../../core/CalendarValidator";
import { validatePlanner } from "./validatePlanner";

export function validatePlanners(planners: Planner[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: string[] = [];

  for (let i = 0; i < planners.length; i++) {
    const result = validatePlanner(planners[i]);
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
