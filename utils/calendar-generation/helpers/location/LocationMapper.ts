/**
 * LocationMapper
 *
 * Resolves effective locations for planners using parent-chain inheritance.
 *
 * Resolution order:
 * 1. If the item has custom override (!useParentLocation) and its own locationId, use it.
 * 2. Walk up the parentId chain — the nearest ancestor with a custom locationId wins.
 * 3. Fall back to the item's (or nearest ancestor's) category location.
 * 4. null = "Anywhere"
 */

import { Planner, EventTemplate, Category } from "@/types/prisma";
import { LocationEntry } from "@/utils/calendar-generation/models/SchedulingModels";

export class LocationMapper {
  private categoryLocationMap: Map<string, string | null>;
  private plannerMap: Map<string, Planner>;

  constructor(categories: Category[] = []) {
    this.categoryLocationMap = new Map();
    this.plannerMap = new Map();
    for (const category of categories) {
      this.categoryLocationMap.set(category.id, category.locationId ?? null);
    }
  }

  buildLocationMap(
    planners: Planner[],
    templates: EventTemplate[]
  ): Map<string, LocationEntry> {
    const locationMap = new Map<string, LocationEntry>();

    if (this.plannerMap.size === 0) {
      for (const planner of planners) {
        this.plannerMap.set(planner.id, planner);
      }
    }

    for (const planner of planners) {
      locationMap.set(planner.id, this.resolveLocationEntry(planner));
    }

    for (const template of templates) {
      locationMap.set(template.id, { locationId: template.locationId ?? null, fromCategory: false });
    }

    return locationMap;
  }

  private resolveLocationEntry(planner: Planner): LocationEntry {
    if (planner.itemType === "plan") {
      return { locationId: planner.locationId ?? null, fromCategory: false };
    }

    if (!planner.useParentLocation && planner.locationId) {
      return { locationId: planner.locationId, fromCategory: false };
    }

    const ancestorLocation = this.findAncestorLocation(planner.parentId);
    if (ancestorLocation) return { locationId: ancestorLocation, fromCategory: false };

    const categoryLocation = this.resolveCategoryLocation(planner);
    return { locationId: categoryLocation, fromCategory: categoryLocation !== null };
  }

  private findAncestorLocation(parentId: string | null): string | null {
    const visited = new Set<string>();
    let currentId = parentId;

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const parent = this.plannerMap.get(currentId);
      if (!parent) break;

      if (!parent.useParentLocation && parent.locationId) {
        return parent.locationId;
      }

      currentId = parent.parentId;
    }

    return null;
  }

  private resolveCategoryLocation(planner: Planner): string | null {
    // Walk up to find the nearest categoryId
    const visited = new Set<string>();
    let current: Planner | undefined = planner;

    while (current) {
      if (current.categoryId) {
        return this.categoryLocationMap.get(current.categoryId) ?? null;
      }
      if (visited.has(current.id)) break;
      visited.add(current.id);
      current = current.parentId
        ? this.plannerMap.get(current.parentId)
        : undefined;
    }

    return null;
  }

}
