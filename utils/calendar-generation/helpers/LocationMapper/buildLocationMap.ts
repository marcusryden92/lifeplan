import { Planner, EventTemplate, PlannerType } from "@/types/prisma";

function findAncestorLocation(
  parentId: string | null,
  plannerMap: Map<string, Planner>,
): string | null {
  const visited = new Set<string>();
  let currentId = parentId;

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const parent = plannerMap.get(currentId);
    if (!parent) break;

    if (!parent.useParentLocation && parent.locationId) {
      return parent.locationId;
    }

    currentId = parent.parentId;
  }

  return null;
}

function resolveCategoryLocation(
  planner: Planner,
  plannerMap: Map<string, Planner>,
  categoryLocationMap: Map<string, string | null>,
): string | null {
  const visited = new Set<string>();
  let current: Planner | undefined = planner;

  while (current) {
    if (current.categoryId) {
      return categoryLocationMap.get(current.categoryId) ?? null;
    }
    if (visited.has(current.id)) break;
    visited.add(current.id);
    current = current.parentId ? plannerMap.get(current.parentId) : undefined;
  }

  return null;
}

function resolveLocation(
  planner: Planner,
  plannerMap: Map<string, Planner>,
  categoryLocationMap: Map<string, string | null>,
): string | null {
  if (planner.plannerType === PlannerType.plan) {
    return planner.locationId ?? null;
  }

  if (!planner.useParentLocation && planner.locationId) {
    return planner.locationId;
  }

  const ancestorLocation = findAncestorLocation(planner.parentId, plannerMap);
  if (ancestorLocation) return ancestorLocation;

  return resolveCategoryLocation(planner, plannerMap, categoryLocationMap);
}

export function buildLocationMap(
  planners: Planner[],
  templates: EventTemplate[],
  categoryLocationMap: Map<string, string | null>,
  plannerMap: Map<string, Planner>,
): Map<string, string | null> {
  const locationMap = new Map<string, string | null>();

  for (const planner of planners) {
    locationMap.set(
      planner.id,
      resolveLocation(planner, plannerMap, categoryLocationMap),
    );
  }

  for (const template of templates) {
    locationMap.set(template.id, template.locationId ?? null);
  }

  return locationMap;
}
