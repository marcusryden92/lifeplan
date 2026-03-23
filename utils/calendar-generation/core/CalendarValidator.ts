import { Planner, EventTemplate, SimpleEvent } from "@/types/prisma";
import {
  validatePlanner,
  validateTemplate,
  validatePlanners,
  validateTemplates,
  validateGenerationInput,
} from "../helpers/CalendarValidator";

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
  static validatePlanner(planner: Planner): ValidationResult {
    return validatePlanner(planner);
  }

  static validateTemplate(template: EventTemplate): ValidationResult {
    return validateTemplate(template);
  }

  static validatePlanners(planners: Planner[]): ValidationResult {
    return validatePlanners(planners);
  }

  static validateTemplates(templates: EventTemplate[]): ValidationResult {
    return validateTemplates(templates);
  }

  static validateGenerationInput(input: {
    userId?: string;
    weekStartDay?: number;
    templates?: EventTemplate[];
    planners?: Planner[];
    previousCalendar?: SimpleEvent[];
  }): ValidationResult {
    return validateGenerationInput(input);
  }
}
