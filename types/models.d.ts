import { EventTemplate as PrismaEventTemplate } from "@/prisma/generated/client";

export type EventTemplate = Omit<PrismaEventTemplate, "startDay" | "startTime">;
