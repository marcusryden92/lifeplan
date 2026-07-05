import { Planner } from "../../generated/client";
import { CATEGORY_IDS } from "./generateCategories";
import { LOCATION_IDS } from "./generateLocations";

type UncompletedSeed = {
  id: string;
  title: string;
  duration: number;
  // Hours back from "now at seed time" when the plan was supposed to start.
  // The engine renders plans wherever `starts` says, so past values stay
  // past — which is exactly what makes them uncompleted under the
  // calendar-event definition (scheduled in the past, never marked complete).
  hoursAgo: number;
  color: string;
  categoryId?: string | null;
  locationId?: string | null;
};

const ROWS: UncompletedSeed[] = [
  {
    id: "seed-uncompleted-1",
    title: "Submit Q3 expenses",
    duration: 20,
    hoursAgo: 4,
    color: "#3b82f6",
    categoryId: CATEGORY_IDS.WORK,
    locationId: LOCATION_IDS.WORK,
  },
  {
    id: "seed-uncompleted-2",
    title: "Reply to landlord email",
    duration: 15,
    hoursAgo: 30,
    color: "#3b82f6",
    locationId: LOCATION_IDS.HOME,
  },
  {
    id: "seed-uncompleted-3",
    title: "Renew gym membership",
    duration: 30,
    hoursAgo: 96,
    color: "#3b82f6",
    locationId: LOCATION_IDS.GYM,
  },
  {
    id: "seed-uncompleted-4",
    title: "Quarterly retro write-up",
    duration: 60,
    hoursAgo: 50,
    color: "#8b5cf6",
    categoryId: CATEGORY_IDS.WORK,
  },
];

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Standalone top-level plans anchored to past `starts` times so the engine
 * emits SimpleEvents that end before "now". Drives the dashboard's
 * uncompleted rollover during development.
 */
export const generateUncompletedItems = (userId: string): Planner[] => {
  const now = new Date();
  const timestamp = now.toISOString();

  return ROWS.map((row) => {
    const starts = new Date(now.getTime() - row.hoursAgo * MS_PER_HOUR);
    const hasOwnLocation = !!row.locationId;
    return {
      id: row.id,
      title: row.title,
      parentId: null,
      plannerType: "plan" as const,
      isReady: true,
      isTriaged: true,
      duration: row.duration,
      deadline: null,
      starts: starts.toISOString(),
      sortOrder: 0,
      completedStartTime: null,
      completedEndTime: null,
      priority: 6,
      userId,
      color: row.color,
      locationId: row.locationId ?? null,
      useParentLocation: !hasOwnLocation,
      categoryId: row.categoryId ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
};

export const uncompletedSeedData = ROWS;
