import { Prisma } from "../generated/client";
import { LOCATION_IDS } from "./generateLocations";

export const CATEGORY_IDS = {
  WORK: "seed-category-work",
} as const;

type CategorySeedInput = Prisma.CategoryCreateInput & { id: string };

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
        create: [
          {
            days: [1, 2, 3],
            startTime: "09:00",
            endTime: "17:00",
          },
          {
            days: [4],
            startTime: "20:00",
            endTime: "04:00",
          },
        ],
      },
      isStrict: true,
      location: { connect: { id: LOCATION_IDS.GAMLA_STAN } },
      user: { connect: { id: userId } },
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
};
