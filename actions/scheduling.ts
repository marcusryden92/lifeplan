"use server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type {
  StrategyRuleType,
  TaskTypeEnum,
  PriorityLevel,
  EnergyLevel,
} from "@/prisma/generated/client";
import type { Prisma } from "@/prisma/generated/client";

export async function fetchStrategiesForUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const strategies = await db.schedulingStrategy.findMany({
    where: { userId: session.user.id },
    include: { rules: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return strategies;
}

export async function createStrategy(data: {
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  rules: Array<{
    ruleType: StrategyRuleType;
    weight: number;
    config: Prisma.InputJsonValue;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (data.isDefault) {
    await db.schedulingStrategy.updateMany({
      where: { userId: session.user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const strategy = await db.schedulingStrategy.create({
    data: {
      userId: session.user.id,
      name: data.name,
      description: data.description,
      isActive: data.isActive,
      isDefault: data.isDefault,
      rules: {
        create: data.rules.map((r, idx) => ({
          ruleType: r.ruleType,
          weight: r.weight,
          config: r.config,
          order: idx,
        })),
      },
    },
    include: { rules: true },
  });

  return strategy;
}

export async function updateStrategy(patch: {
  id: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  rules?: Array<{
    id?: string;
    ruleType: StrategyRuleType;
    weight: number;
    config: Prisma.InputJsonValue;
    order: number;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const { id, rules, ...updates } = patch;

  const existing = await db.schedulingStrategy.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) throw new Error("Not Found");

  if (updates.isDefault) {
    await db.schedulingStrategy.updateMany({
      where: { userId: session.user.id, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  if (rules) {
    await db.strategyRule.deleteMany({ where: { strategyId: id } });
    const strategy = await db.schedulingStrategy.update({
      where: { id },
      data: {
        ...updates,
        rules: {
          create: rules.map((r) => ({
            ruleType: r.ruleType,
            weight: r.weight,
            config: r.config,
            order: r.order,
          })),
        },
      },
      include: { rules: true },
    });
    return strategy;
  }

  const strategy = await db.schedulingStrategy.update({
    where: { id },
    data: updates,
    include: { rules: true },
  });
  return strategy;
}

export async function deleteStrategy(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const strategy = await db.schedulingStrategy.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!strategy) throw new Error("Not Found");

  await db.schedulingStrategy.delete({ where: { id } });
  return { success: true };
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

  // Build update/create payloads with correct shapes for Prisma types.
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
    // The DB model requires arrays for preferredDays/avoidDays; default to empty arrays when creating.
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
