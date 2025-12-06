"use server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type {
  TaskTypeEnum,
  PriorityLevel,
  EnergyLevel,
} from "@/prisma/generated/client";
import type { Prisma } from "@/prisma/generated/client";

// User Scheduling Preferences
export async function fetchUserSchedulingPreferences() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const prefs = await db.userSchedulingPreferences.findUnique({
    where: { userId: session.user.id },
  });

  return prefs ?? null;
}

/**
 * Fetch all user scheduling data at once (preferences + travel times)
 * Called once at login to populate Redux store
 */
export async function fetchAllSchedulingData(): Promise<{
  preferences: {
    bufferTimeMinutes: number;
    defaultTransportMode: string;
  };
  travelTimes: Array<{
    key: string;
    fromLocationId: string;
    toLocationId: string;
    rushHourMinutes: number;
    regularMinutes: number;
    nightMinutes: number;
  }>;
}> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Fetch user preferences
  const prefs = await db.userSchedulingPreferences.findUnique({
    where: { userId: session.user.id },
  });

  const defaultTransportMode = prefs?.defaultTransportMode ?? "DRIVING";

  // Fetch travel times for user's default transport mode
  const travelTimes = await db.travelTime.findMany({
    where: {
      userId: session.user.id,
      transportMode: defaultTransportMode,
    },
  });

  // Convert travel times to serializable format with effective values
  const travelTimeMatrix = travelTimes.map((tt) => ({
    key: `${tt.fromLocationId}-${tt.toLocationId}`,
    fromLocationId: tt.fromLocationId,
    toLocationId: tt.toLocationId,
    rushHourMinutes: tt.customRushHourMinutes ?? tt.googleRushHourMinutes,
    regularMinutes: tt.customRegularMinutes ?? tt.googleRegularMinutes,
    nightMinutes: tt.customNightMinutes ?? tt.googleNightMinutes,
  }));

  return {
    preferences: {
      bufferTimeMinutes: prefs?.bufferTimeMinutes ?? 10,
      defaultTransportMode,
    },
    travelTimes: travelTimeMatrix,
  };
}

export async function updateUserSchedulingPreferences(data: {
  bufferTimeMinutes: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const prefs = await db.userSchedulingPreferences.upsert({
    where: { userId: session.user.id },
    update: {
      bufferTimeMinutes: data.bufferTimeMinutes,
    },
    create: {
      userId: session.user.id,
      bufferTimeMinutes: data.bufferTimeMinutes,
    },
  });

  return prefs;
}

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
