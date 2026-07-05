import { Prisma } from "../../generated/client";
import { LOCATION_IDS } from "./generateLocations";

export const CATEGORY_IDS = {
  WORK: "seed-category-work",
} as const;

type CategorySeedInput = Prisma.CategoryCreateInput & { id: string };

// 0=Sunday, 1=Monday, ... 6=Saturday â€” matches JS Date.getDay() and what's
// stored in CategoryTimeWindow.day.
type SeedTimeWindow = {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  endTime: string;
};

const withOwner = (
  userId: string,
  slots: SeedTimeWindow[],
): Prisma.CategoryTimeWindowCreateWithoutCategoryInput[] =>
  slots.map((slot) => ({
    ...slot,
    user: { connect: { id: userId } },
  }));

export const generateCategories = (userId: string): CategorySeedInput[] => {
  const timestamp = new Date().toISOString();

  return [
    {
      id: CATEGORY_IDS.WORK,
      name: "Work",
      icon: null,
      color: null,
      sortOrder: 0,
      timeSlots: {
        create: withOwner(userId, [
          { day: 1, startTime: "09:00", endTime: "17:00" },
          { day: 2, startTime: "09:00", endTime: "17:00" },
          { day: 3, startTime: "09:00", endTime: "17:00" },
          { day: 4, startTime: "09:00", endTime: "17:00" },
          { day: 5, startTime: "09:00", endTime: "17:00" },
        ]),
      },
      isStrict: true,
      location: { connect: { id: LOCATION_IDS.GAMLA_STAN } },
      user: { connect: { id: userId } },
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
};
