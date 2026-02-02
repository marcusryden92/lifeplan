/**
 * LocationMapper
 *
 * Handles location inheritance logic for planners and templates.
 * Planners inherit location from their category if not explicitly set.
 */

import { Planner, EventTemplate, Category } from "@/types/prisma";

export class LocationMapper {
  private categoryLocationMap: Map<string, string | null>;

  constructor(categories: Category[] = []) {
    this.categoryLocationMap = new Map();
    for (const category of categories) {
      this.categoryLocationMap.set(category.id, category.locationId ?? null);
    }
  }

  /**
   * Build a map of planner/template ID -> effective location ID
   * Planners inherit from their category if no explicit location is set
   * Templates do not inherit from categories
   */
  buildLocationMap(
    planners: Planner[],
    templates: EventTemplate[]
  ): Map<string, string | null> {
    const locationMap = new Map<string, string | null>();

    // Process planners with location inheritance
    for (const planner of planners) {
      const effectiveLocation = this.resolveLocation(planner);
      locationMap.set(planner.id, effectiveLocation);
    }

    // Process templates (no inheritance)
    for (const template of templates) {
      locationMap.set(template.id, template.locationId ?? null);
    }

    return locationMap;
  }

  /**
   * Resolve the effective location for a planner
   * Returns explicit location if set, otherwise inherits from category
   */
  private resolveLocation(planner: Planner): string | null {
    // Explicit location takes precedence
    if (planner.locationId) {
      return planner.locationId;
    }

    // Inherit from category if available
    if (planner.categoryId) {
      return this.categoryLocationMap.get(planner.categoryId) ?? null;
    }

    return null;
  }

  /**
   * Get the effective location for a specific planner ID
   */
  getLocation(plannerId: string, planners: Planner[]): string | null {
    const planner = planners.find((p) => p.id === plannerId);
    if (!planner) return null;
    return this.resolveLocation(planner);
  }
}
