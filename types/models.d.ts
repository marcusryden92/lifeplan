import { EventTemplate as PrismaEventTemplate } from "@prisma/client";

export type EventTemplate = Omit<PrismaEventTemplate, "startDay" | "startTime">;
