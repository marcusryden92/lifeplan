import { Prisma } from "../generated/client";
import { LOCATION_IDS } from "./generateLocations";

export const CATEGORY_IDS = {
  WORK: "seed-category-work",
  FUN: "seed-category-fun",
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
            days: ["monday", "tuesday"],
            startTime: "09:00",
            endTime: "17:00",
          },
          {
            days: ["wednesday"],
            startTime: "20:00",
            endTime: "00:00",
          },
          {
            days: ["thursday"],
            startTime: "20:00",
            endTime: "04:00",
          },
          {
            days: ["saturday"],
            startTime: "09:00",
            endTime: "09:30",
          },
          {
            days: ["saturday"],
            startTime: "10:00",
            endTime: "10:30",
          },
          {
            days: ["saturday"],
            startTime: "12:00",
            endTime: "13:00",
          },
        ],
      },
      isStrict: true,
      location: { connect: { id: LOCATION_IDS.GAMLA_STAN } },
      user: { connect: { id: userId } },
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: CATEGORY_IDS.FUN,
      name: "Fun",
      icon: null,
      color: "#22c55e",
      sortOrder: 1,
      timeSlots: {
        create: [
          {
            days: ["thursday"],
            startTime: "00:00",
            endTime: "02:00",
          },
          {
            days: ["saturday"],
            startTime: "09:30",
            endTime: "10:00",
          },
          {
            days: ["saturday"],
            startTime: "11:00",
            endTime: "12:00",
          },
        ],
      },
      isStrict: true,
      location: { connect: { id: LOCATION_IDS.VARMDO } },
      user: { connect: { id: userId } },
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
};
