"use server";
import { Planner } from "@/lib/plannerClass";
import { SimpleEvent } from "@/types/calendarTypes";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function syncCalendarData(
  userId: string,
  create: Planner[],
  update: Planner[],
  destroy: Planner[],
  createEvent: SimpleEvent[],
  updateEvent: SimpleEvent[],
  destroyEvent: SimpleEvent[]
) {
  try {
    const operations = [];

    // === Planner: CREATE ===
    if (create.length) {
      const plannerCreateData = create.map((planner) => ({
        id: planner.id,
        title: planner.title,
        parentId: planner.parentId ?? null,
        type: planner.type ?? null,
        isReady: planner.isReady ?? false,
        duration: planner.duration ?? null,
        deadline: planner.deadline ?? null,
        starts: planner.starts ?? null,
        dependency: planner.dependency ?? null,
        // Fix: Convert null to Prisma.JsonNull for JSON fields
        completed: planner.completed ?? Prisma.JsonNull,
        userId,
      }));

      operations.push(
        db.planner.createMany({
          data: plannerCreateData,
          skipDuplicates: true,
        })
      );
    }

    // === Planner: UPDATE ===
    for (const planner of update) {
      operations.push(
        db.planner.update({
          where: { id: planner.id },
          data: {
            title: planner.title,
            parentId: planner.parentId ?? null,
            type: planner.type ?? null,
            isReady: planner.isReady ?? false,
            duration: planner.duration ?? null,
            deadline: planner.deadline ?? null,
            starts: planner.starts ?? null,
            dependency: planner.dependency ?? null,
            // Fix: Convert null to Prisma.JsonNull for JSON fields
            completed: planner.completed ?? Prisma.JsonNull,
            userId,
          },
        })
      );
    }

    // === Planner: DELETE ===
    if (destroy.length) {
      operations.push(
        db.planner.deleteMany({
          where: { id: { in: destroy.map((p) => p.id) } },
        })
      );
    }

    // === CalendarEvent: CREATE ===
    if (createEvent.length) {
      const calendarCreateData = createEvent.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        // Fix: Convert null to Prisma.JsonNull for JSON fields
        rrule: event.rrule ?? Prisma.JsonNull,
        userId,
      }));

      operations.push(
        db.calendarEvent.createMany({
          data: calendarCreateData,
          skipDuplicates: true,
        })
      );
    }

    // === CalendarEvent: UPDATE ===
    for (const event of updateEvent) {
      operations.push(
        db.calendarEvent.update({
          where: { id: event.id },
          data: {
            title: event.title,
            start: event.start,
            end: event.end,
            // Fix: Convert null to Prisma.JsonNull for JSON fields
            rrule: event.rrule ?? Prisma.JsonNull,
            userId,
          },
        })
      );
    }

    // === CalendarEvent: DELETE ===
    if (destroyEvent.length) {
      operations.push(
        db.calendarEvent.deleteMany({
          where: { id: { in: destroyEvent.map((e) => e.id) } },
        })
      );
    }

    // === Execute transaction ===
    const response = await db.$transaction(operations);

    return { success: true, data: response };
  } catch (error) {
    console.error("Failed to sync planner and calendar data:", error);
    return { success: false, error: error };
  }
}
