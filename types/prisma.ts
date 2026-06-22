import { Prisma } from "@/prisma/client";
import type { WeekDayIntegers } from "./calendarTypes";
export { PlannerType, EventType, UserRole } from "@/prisma/client";

// SimpleEvent with runtime fields added to extendedProps
export type SimpleEvent = Omit<
  Prisma.SimpleEventGetPayload<{
    include: { extendedProps: true };
  }>,
  "extendedProps"
> & {
  extendedProps:
    | (Prisma.EventExtendedPropsGetPayload<undefined> & {
        categoryWrapperId?: string | null;
        wrapperId?: string | null;
        fromLocationId?: string | null;
        toLocationId?: string | null;
        travelMinutes?: number | null;
        insufficientTravel?: boolean;
        requiredTravelMinutes?: number | null;
      })
    | null;
};

export type Planner = Prisma.PlannerGetPayload<undefined>;

export type PlannerWithLocation = Prisma.PlannerGetPayload<{
  include: { location: true };
}>;

type RawEventTemplate = Prisma.EventTemplateGetPayload<undefined>;
export type EventTemplate = Omit<RawEventTemplate, "startDay"> & {
  startDay: WeekDayIntegers;
};

export type EventExtendedProps = Prisma.EventExtendedPropsGetPayload<undefined>;

export type Location = Prisma.LocationGetPayload<undefined>;

export type TravelTime = Prisma.TravelTimeGetPayload<undefined>;

export type TravelTimeWithLocations = Prisma.TravelTimeGetPayload<{
  include: { fromLocation: true; toLocation: true };
}>;

type RawCategoryTimeWindow = Prisma.CategoryTimeWindowGetPayload<undefined>;
export type CategoryTimeWindow = Omit<RawCategoryTimeWindow, "day"> & {
  day: WeekDayIntegers;
};

type RawCategory = Prisma.CategoryGetPayload<{ include: { timeSlots: true } }>;
export type Category = Omit<RawCategory, "timeSlots"> & {
  timeSlots: CategoryTimeWindow[];
};

type RawCategoryWithChildren = Prisma.CategoryGetPayload<{
  include: { children: true; timeSlots: true };
}>;
export type CategoryWithChildren = Omit<
  RawCategoryWithChildren,
  "timeSlots" | "children"
> & {
  timeSlots: CategoryTimeWindow[];
  children: Category[];
};

export type PlannerWithCategory = Prisma.PlannerGetPayload<{
  include: { category: true };
}>;
