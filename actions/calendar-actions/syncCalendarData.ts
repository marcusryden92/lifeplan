"use server";

import { db } from "@/lib/db";
import { SimpleEvent, Planner, EventTemplate } from "@/prisma/generated/client";

export async function syncCalendarData(
  userId: string,
  create: Planner[],
  update: Planner[],
  destroy: Planner[],
  createEvent: SimpleEvent[],
  updateEvent: SimpleEvent[],
  destroyEvent: SimpleEvent[],
  createTemplate?: EventTemplate[],
  updateTemplate?: EventTemplate[],
  destroyTemplate?: EventTemplate[]
) {
  try {
    const operations = [];

    const now = new Date();
    const updatedAt = now.toISOString();

    // === Planner: CREATE ===
    if (create.length) {
      operations.push(
        db.planner.createMany({
          data: create.map((planner) => ({
            ...planner,
            userId,
          })),
          skipDuplicates: true,
        })
      );
    }

    // === Planner: UPDATE ===
    for (const plannerUpdate of update) {
      const { userId: _userId, ...rest } = plannerUpdate;

      operations.push(
        db.planner.update({
          where: { id: plannerUpdate.id },
          data: {
            ...rest,
            updatedAt,
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
      operations.push(
        db.simpleEvent.createMany({
          data: createEvent.map((event) => ({
            ...event,
            userId,
          })),
          skipDuplicates: true,
        })
      );
    }

    // === CalendarEvent: UPDATE ===
    for (const event of updateEvent) {
      operations.push(
        db.simpleEvent.update({
          where: { id: event.id },
          data: {
            ...event,
            userId,
            updatedAt,
          },
        })
      );
    }

    // === CalendarEvent: DELETE ===
    if (destroyEvent.length) {
      operations.push(
        db.simpleEvent.deleteMany({
          where: { id: { in: destroyEvent.map((e) => e.id) } },
        })
      );
    }

    // === EventTemplate: CREATE ===
    if (createTemplate?.length) {
      operations.push(
        db.eventTemplate.createMany({
          data: createTemplate.map((template) => ({
            ...template,
            userId,
          })),
          skipDuplicates: true,
        })
      );
    }

    // === EventTemplate: UPDATE ===
    if (updateTemplate?.length) {
      for (const template of updateTemplate) {
        operations.push(
          db.eventTemplate.update({
            where: { id: template.id },
            data: {
              ...template,
              userId,
              updatedAt,
            },
          })
        );
      }
    }

    // === EventTemplate: DELETE ===
    if (destroyTemplate?.length) {
      operations.push(
        db.eventTemplate.deleteMany({
          where: { id: { in: destroyTemplate.map((t) => t.id) } },
        })
      );
    }

    // === Execute transaction ===
    await db.$transaction(operations);

    return { success: true };
  } catch (error) {
    console.error("Failed to sync planner and calendar data:", error);
    return { success: false };
  }
}
