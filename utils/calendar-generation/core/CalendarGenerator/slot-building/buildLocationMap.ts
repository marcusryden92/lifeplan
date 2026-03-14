/**
 * Location Map Builder
 *
 * Builds location map for location-aware slot building
 */

import { Planner, EventTemplate, Category } from "@/types/prisma";
import { LocationMapper } from "../../../helpers/location/LocationMapper";

export function buildLocationMap(
  planners: Planner[],
  templates: EventTemplate[],
  categories: Category[]
): { locationMap: Map<string, string | null>; travelLocationMap: Map<string, string | null> } {
  const locationMapper = new LocationMapper(categories);
  return {
    locationMap: locationMapper.buildLocationMap(planners, templates),
    travelLocationMap: locationMapper.buildTravelLocationMap(planners, templates),
  };
}
