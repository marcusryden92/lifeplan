import { Planner, EventTemplate, Category } from "@/types/prisma";
import { buildLocationMap } from "../helpers/LocationMapper";

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
    if (this.plannerMap.size === 0) {
      for (const planner of planners) {
        this.plannerMap.set(planner.id, planner);
      }
    }
    return buildLocationMap(planners, templates, this.categoryLocationMap, this.plannerMap);
  }
}
