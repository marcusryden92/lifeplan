/**
 * Location Map Builder
 *
 * Builds location map for location-aware slot building
 */

import { Planner, EventTemplate, Category } from "@/types/prisma";
import { LocationMapper } from "../../../helpers/location/LocationMapper";
import { LocationEntry } from "../../../models/SchedulingModels";

export function buildLocationMap(
  planners: Planner[],
  templates: EventTemplate[],
  categories: Category[]
): Map<string, LocationEntry> {
  const locationMapper = new LocationMapper(categories);
  return locationMapper.buildLocationMap(planners, templates);
}
