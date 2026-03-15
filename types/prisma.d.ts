import { Prisma } from "@/prisma/generated/client";

export type UserRole = Prisma.UserRoleGetPayload<undefined>;

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

export type ItemType = Prisma.ItemTypeGetPayload<undefined>;

export type Location = Prisma.LocationGetPayload<undefined>;

export type TravelTime = Prisma.TravelTimeGetPayload<undefined>;

export type TravelTimeWithLocations = Prisma.TravelTimeGetPayload<{
  include: { fromLocation: true; toLocation: true };
}>;

export type Category = Prisma.CategoryGetPayload<undefined>;

export type CategoryWithChildren = Prisma.CategoryGetPayload<{
  include: { children: true };
}>;

export type PlannerWithCategory = Prisma.PlannerGetPayload<{
  include: { category: true };
}>;
