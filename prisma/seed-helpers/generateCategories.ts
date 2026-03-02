import { Prisma } from "../generated/client";
import { LOCATION_IDS } from "./generateLocations";

export const CATEGORY_IDS = {
  WORK: "seed-category-work",
} as const;

export const generateCategories = (userId: string): Prisma.CategoryCreateManyInput[] => {
  const timestamp = new Date().toISOString();

  return [
    {
      id: CATEGORY_IDS.WORK,
      name: "Work",
      icon: null,
      color: null,
      sortOrder: 0,
      timeSlots: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: "09:00",
          endTime: "17:00",
        },
      ],
      isStrict: true,
      locationId: LOCATION_IDS.GAMLA_STAN,
      parentId: null,
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
};
