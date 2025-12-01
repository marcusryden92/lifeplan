"use server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type {
  TaskTypeEnum,
  PriorityLevel,
  EnergyLevel,
} from "@/prisma/generated/client";
import type { Prisma } from "@/prisma/generated/client";

export async function fetchTaskPreferences(plannerId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const planner = await db.planner.findFirst({
    where: { id: plannerId, userId: session.user.id },
  });

  if (!planner) throw new Error("Not Found");

  const prefs = await db.taskPreferences.findUnique({ where: { plannerId } });
  return prefs ?? null;
}

export async function upsertTaskPreferences(
  plannerId: string,
  prefs: {
    taskType?: TaskTypeEnum | null;
    preferredDays?: number[] | null;
    avoidDays?: number[] | null;
    preferredStartTime?: string | null;
    preferredEndTime?: string | null;
    priority?: PriorityLevel | null;
    energyLevel?: EnergyLevel | null;
    allowFlexibility?: boolean | null;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const planner = await db.planner.findFirst({
    where: { id: plannerId, userId: session.user.id },
  });

  if (!planner) throw new Error("Not Found");

  const updatePayload: Prisma.TaskPreferencesUpdateInput = {
    taskType: prefs.taskType ?? undefined,
    preferredDays: prefs.preferredDays ?? undefined,
    avoidDays: prefs.avoidDays ?? undefined,
    preferredStartTime: prefs.preferredStartTime ?? undefined,
    preferredEndTime: prefs.preferredEndTime ?? undefined,
    priority: prefs.priority ?? undefined,
    energyLevel: prefs.energyLevel ?? undefined,
    allowFlexibility: prefs.allowFlexibility ?? undefined,
  };

  const createPayload: Prisma.TaskPreferencesCreateInput = {
    plannerId,
    taskType: prefs.taskType ?? undefined,
    preferredDays: prefs.preferredDays ?? [],
    avoidDays: prefs.avoidDays ?? [],
    preferredStartTime: prefs.preferredStartTime ?? undefined,
    preferredEndTime: prefs.preferredEndTime ?? undefined,
    priority: prefs.priority ?? undefined,
    energyLevel: prefs.energyLevel ?? undefined,
    allowFlexibility: prefs.allowFlexibility ?? true,
  };

  const preferences = await db.taskPreferences.upsert({
    where: { plannerId },
    update: updatePayload,
    create: createPayload,
  });

  return preferences;
}
