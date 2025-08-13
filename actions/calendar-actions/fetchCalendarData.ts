"use server";
import { db } from "@/lib/db";
import { SimpleEvent, EventTemplate, Planner } from "@/prisma/generated/client";

// Fetches the raw data from the database
export async function fetchCalendarData(userId: string) {
  try {
    // Fetch all planner items for the user
    const planner: Planner[] = await db.planner.findMany({
      where: {
        userId: userId,
      },
    });

    // Fetch all calendar events for the user
    const calendarEvents: SimpleEvent[] = await db.simpleEvent.findMany({
      where: {
        userId: userId,
      },
    });

    const templatesItems: EventTemplate[] = await db.eventTemplate.findMany({
      where: {
        userId: userId,
      },
    });

    return {
      success: true,
      data: {
        planner: planner,
        calendar: calendarEvents,
        template: templatesItems,
      },
    };
  } catch (error) {
    console.error("Failed to fetch calendar data:", error);
    return {
      success: false,
      error: error,
    };
  }
}
