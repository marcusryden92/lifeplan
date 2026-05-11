import { Prisma } from "@/prisma/generated/client";
export { PlannerType, EventType, UserRole } from "@/prisma/generated/client";

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

export type EventTemplate = Prisma.EventTemplateGetPayload<undefined>;

export type EventExtendedProps = Prisma.EventExtendedPropsGetPayload<undefined>;

export type Location = Prisma.LocationGetPayload<undefined>;

export type TravelTime = Prisma.TravelTimeGetPayload<undefined>;

export type TravelTimeWithLocations = Prisma.TravelTimeGetPayload<{
  include: { fromLocation: true; toLocation: true };
}>;

export type Category = Prisma.CategoryGetPayload<{
  include: { timeSlots: true };
}>;

export type CategoryTimeSlot = Prisma.CategoryTimeSlotGetPayload<undefined>;

export type CategoryWithChildren = Prisma.CategoryGetPayload<{
  include: { children: true; timeSlots: true };
}>;

export type PlannerWithCategory = Prisma.PlannerGetPayload<{
  include: { category: true };
}>;
