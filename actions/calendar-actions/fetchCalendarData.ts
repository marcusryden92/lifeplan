"use server";
import { db } from "@/lib/db";
import { SimpleEvent, EventTemplate, Planner, Category } from "@/types/prisma";

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
      include: { extendedProps: true },
    });

    const templatesItems: EventTemplate[] = await db.eventTemplate.findMany({
      where: {
        userId: userId,
      },
    });

    const categoriesRaw = await db.category.findMany({
      where: {
        userId: userId,
      },
      include: { timeSlots: true, location: true },
    });

    // Serialize Date fields in location to avoid Redux non-serializable warnings
    const categories = categoriesRaw.map((cat) => ({
      ...cat,
      location: cat.location
        ? {
            ...cat.location,
            createdAt: cat.location.createdAt.toISOString(),
            updatedAt: cat.location.updatedAt.toISOString(),
          }
        : null,
    }));

    return {
      success: true,
      data: {
        planner: planner,
        calendar: calendarEvents,
        template: templatesItems,
        categories: categories as Category[],
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
