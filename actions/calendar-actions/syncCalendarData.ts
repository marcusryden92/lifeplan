"use server";
import { Planner } from "@/lib/plannerClass";
import { SimpleEvent } from "@/types/calendarTypes";
import { EventTemplate } from "@/utils/templateBuilderUtils";
import { db } from "@/lib/db";

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

    // === Planner: CREATE ===
    if (create.length) {
      const plannerCreateData = create.map((planner) => ({
        userId,
        id: planner.id,
        title: planner.title,
        parentId: planner.parentId ?? null,
        type: planner.type ?? null,
        isReady: planner.isReady ?? false,
        duration: planner.duration ?? null,
        deadline: planner.deadline?.toISOString() ?? null,
        starts: planner.starts?.toISOString() ?? null,
        dependency: planner.dependency ?? null,
        completedStartTime: planner.completed?.startTime ?? null,
        completedEndTime: planner.completed?.endTime ?? null,
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
            userId,
            title: planner.title,
            parentId: planner.parentId ?? null,
            type: planner.type ?? null,
            isReady: planner.isReady ?? false,
            duration: planner.duration ?? null,
            deadline: planner.deadline?.toISOString() ?? null,
            starts: planner.starts?.toISOString() ?? null,
            dependency: planner.dependency ?? null,
            completedStartTime: planner.completed?.startTime ?? null,
            completedEndTime: planner.completed?.endTime ?? null,
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
        userId,
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        rrule: JSON.stringify(event.rrule),
        extendedProps: JSON.stringify(event.extendedProps),
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
            userId,
            title: event.title,
            start: event.start,
            end: event.end,
            rrule: JSON.stringify(event.rrule),
            extendedProps: JSON.stringify(event.extendedProps),
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

    // === EventTemplate: CREATE ===
    if (createTemplate?.length) {
      const templateCreateData = createTemplate.map((template) => ({
        userId,
        id: template.id,
        title: template.title,
        startDay: template.start.day,
        startTime: template.start.time,
        duration: template.duration,
      }));

      operations.push(
        db.eventTemplate.createMany({
          data: templateCreateData,
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
              title: template.title,
              startDay: template.start.day,
              startTime: template.start.time,
              duration: template.duration,
              userId,
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
    const response = await db.$transaction(operations);

    return { success: true, data: response };
  } catch (error) {
    console.error("Failed to sync planner and calendar data:", error);
    return { success: false, error: error };
  }
}
