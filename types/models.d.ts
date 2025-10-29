import { EventTemplate as PrismaEventTemplate } from "@/types/prisma";

export type EventTemplate = Omit<PrismaEventTemplate, "startDay" | "startTime">;
