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
  ): Map<string, string | null> {
    const locationMap = new Map<string, string | null>();

    this.plannerMap = new Map();
    for (const planner of planners) {
      this.plannerMap.set(planner.id, planner);
    }

    for (const planner of planners) {
      locationMap.set(planner.id, this.resolveLocation(planner));
    }

    for (const template of templates) {
      locationMap.set(template.id, template.locationId ?? null);
    }

    return locationMap;
  }

  private resolveLocation(planner: Planner): string | null {
    // Plan items always use their own location (no inheritance)
    if (planner.itemType === "plan") {
      return planner.locationId ?? null;
    }

    if (!planner.useParentLocation && planner.locationId) {
      return planner.locationId;
    }

    // Walk up the parent chain looking for a custom location
    const ancestorLocation = this.findAncestorLocation(planner.parentId);
    if (ancestorLocation) return ancestorLocation;

    // Fall back to category location
    return this.resolveCategoryLocation(planner);
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

  getLocation(plannerId: string, planners: Planner[]): string | null {
    const planner = planners.find((p) => p.id === plannerId);
    if (!planner) return null;

    // Ensure plannerMap is populated
    if (this.plannerMap.size === 0) {
      for (const p of planners) {
        this.plannerMap.set(p.id, p);
      }
    }

    return this.resolveLocation(planner);
  }
}
