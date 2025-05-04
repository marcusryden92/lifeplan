"use server";
import { db } from "@/lib/db";

// Fetches the raw data from the database
export async function fetchCalendarData(userId: string) {
  try {
    // Fetch all planner items for the user
    const mainPlanner = await db.planner.findMany({
      where: {
        userId: userId,
      },
    });

    // Fetch all calendar events for the user
    const calendarEvents = await db.calendarEvent.findMany({
      where: {
        userId: userId,
      },
    });

    const templatesItems = await db.eventTemplate.findMany({
      where: {
        userId: userId,
      },
    });

    return {
      success: true,
      data: {
        planner: mainPlanner,
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
