import { Prisma } from "@/prisma/generated/client";

export type UserRole = Prisma.UserRoleGetPayload<undefined>;

export type SimpleEvent = Prisma.SimpleEventGetPayload<{
  include: { extendedProps: true };
}>;

export type Planner = Prisma.PlannerGetPayload<undefined>;

export type EventTemplate = Prisma.EventTemplateGetPayload<undefined>;

export type EventExtendedProps = Prisma.EventExtendedPropsGetPayload<undefined>;

export type ItemType = Prisma.ItemTypeGetPayload<undefined>;
