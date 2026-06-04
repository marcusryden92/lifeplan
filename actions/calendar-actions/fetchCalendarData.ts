"use server";
import { db } from "@/lib/db";
import { SimpleEvent, EventTemplate, Planner, Category } from "@/types/prisma";
import { weekdayToInt } from "@/utils/calendarUtils";
import type { WeekDayType, WeekDayIntegers } from "@/types/calendarTypes";

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

    const templatesRaw = await db.eventTemplate.findMany({
      where: {
        userId: userId,
      },
    });
    // Narrow startDay: DB enum string -> WeekDayIntegers for app code.
    const templatesItems: EventTemplate[] = templatesRaw.map((t) => ({
      ...t,
      startDay: weekdayToInt(t.startDay),
    }));

    const categoriesRaw = await db.category.findMany({
      where: {
        userId: userId,
      },
      include: { timeSlots: true, location: true },
    });

    // Narrow timeSlots.day at the DB boundary and serialize location Dates
    // to avoid Redux non-serializable warnings.
    const categories: Category[] = categoriesRaw.map((cat) => ({
      ...cat,
      timeSlots: cat.timeSlots.map((ts) => ({
        ...ts,
        day: ts.day as WeekDayIntegers,
      })),
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
        categories: categories,
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
