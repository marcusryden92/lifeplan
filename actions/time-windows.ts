"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { WeekDayIntegers } from "@/types/calendarTypes";
import { intToWeekday, weekdayToInt } from "@/utils/calendarUtils";
import { findOverlap } from "@/utils/category-constraints/overlapCheck";

export interface TimeWindowRecord {
  id: string;
  days: WeekDayIntegers[];
  startTime: string;
  endTime: string;
  categoryId: string | null;
}

type RawTimeWindowRow = {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
  categoryId: string | null;
};

function narrowTimeWindow(row: RawTimeWindowRow): TimeWindowRecord {
  return {
    id: row.id,
    days: row.days.map((d) =>
      weekdayToInt(d as Parameters<typeof weekdayToInt>[0]),
    ),
    startTime: row.startTime,
    endTime: row.endTime,
    categoryId: row.categoryId,
  };
}

export async function fetchAllTimeWindows(): Promise<TimeWindowRecord[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const rows = await db.categoryTimeWindow.findMany({
    where: { userId: session.user.id },
  });
  return rows.map(narrowTimeWindow);
}

async function assertNoOverlap(
  userId: string,
  candidate: { days: WeekDayIntegers[]; startTime: string; endTime: string },
  excludeWindowId: string | null,
): Promise<void> {
  const rows = await db.categoryTimeWindow.findMany({
    where: {
      userId,
      ...(excludeWindowId ? { id: { not: excludeWindowId } } : {}),
    },
    include: { category: { select: { name: true } } },
  });

  const obstacles = rows.map((row) => ({
    id: row.id,
    label: row.category?.name ?? "unassigned window",
    timeSlots: [
      {
        days: row.days.map((d) =>
          weekdayToInt(d as Parameters<typeof weekdayToInt>[0]),
        ),
        startTime: row.startTime,
        endTime: row.endTime,
      },
    ],
  }));

  const conflict = findOverlap([candidate], obstacles);
  if (conflict) {
    throw new Error(
      `Time window overlaps with ${conflict.obstacleLabel} (${conflict.conflictStartTime}–${conflict.conflictEndTime})`,
    );
  }
}

export async function createTimeWindow(data: {
  days: WeekDayIntegers[];
  startTime: string;
  endTime: string;
  categoryId?: string | null;
}): Promise<TimeWindowRecord> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (data.categoryId) {
    const category = await db.category.findFirst({
      where: { id: data.categoryId, userId: session.user.id },
    });
    if (!category) throw new Error("Category not found");
  }

  await assertNoOverlap(session.user.id, data, null);

  const row = await db.categoryTimeWindow.create({
    data: {
      days: data.days.map(intToWeekday),
      startTime: data.startTime,
      endTime: data.endTime,
      categoryId: data.categoryId ?? null,
      userId: session.user.id,
    },
  });
  return narrowTimeWindow(row);
}

export async function updateTimeWindow(
  windowId: string,
  data: {
    days?: WeekDayIntegers[];
    startTime?: string;
    endTime?: string;
    categoryId?: string | null;
  },
): Promise<TimeWindowRecord> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await db.categoryTimeWindow.findFirst({
    where: { id: windowId, userId: session.user.id },
  });
  if (!existing) throw new Error("Time window not found");

  if (data.categoryId !== undefined && data.categoryId !== null) {
    const category = await db.category.findFirst({
      where: { id: data.categoryId, userId: session.user.id },
    });
    if (!category) throw new Error("Category not found");
  }

  const timeFieldsChanged =
    data.days !== undefined ||
    data.startTime !== undefined ||
    data.endTime !== undefined;

  if (timeFieldsChanged) {
    const nextDays = data.days ??
      existing.days.map((d) =>
        weekdayToInt(d as Parameters<typeof weekdayToInt>[0]),
      );
    await assertNoOverlap(
      session.user.id,
      {
        days: nextDays,
        startTime: data.startTime ?? existing.startTime,
        endTime: data.endTime ?? existing.endTime,
      },
      windowId,
    );
  }

  const row = await db.categoryTimeWindow.update({
    where: { id: windowId },
    data: {
      ...(data.days !== undefined && {
        days: data.days.map(intToWeekday),
      }),
      ...(data.startTime !== undefined && { startTime: data.startTime }),
      ...(data.endTime !== undefined && { endTime: data.endTime }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
    },
  });
  return narrowTimeWindow(row);
}

export async function deleteTimeWindow(windowId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await db.categoryTimeWindow.findFirst({
    where: { id: windowId, userId: session.user.id },
  });
  if (!existing) throw new Error("Time window not found");

  await db.categoryTimeWindow.delete({ where: { id: windowId } });
}
