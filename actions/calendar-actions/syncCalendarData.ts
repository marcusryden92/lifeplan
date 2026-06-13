"use server";

import { db } from "@/lib/db";
import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
import { handlePlannerChanges } from "./sync-handlers/plannerHandlers";
import { handleCalendarChanges } from "./sync-handlers/calendarHandlers";
import { handleExtendedPropsChanges } from "./sync-handlers/extendedPropsHandlers";
import { handleTemplateChanges } from "./sync-handlers/templateHandlers";
import { handleCategoryChanges } from "./sync-handlers/categoryHandlers";
import { handleLocationChanges } from "./sync-handlers/locationHandlers";

export async function syncCalendarData(
  userId: string,
  databaseChanges: DatabaseChanges
) {
  try {
    const now = new Date();
    const updatedAt = now.toISOString();

    const operations = [
      ...handlePlannerChanges(db, userId, databaseChanges, updatedAt),
      ...handleCalendarChanges(db, userId, databaseChanges, updatedAt),
      ...handleExtendedPropsChanges(db, databaseChanges),
      ...handleTemplateChanges(db, userId, databaseChanges, updatedAt),
      ...handleCategoryChanges(db, userId, databaseChanges, updatedAt),
      ...handleLocationChanges(db, userId, databaseChanges),
    ];

    console.log("📊 Sync operations:", {
      totalOps: operations.length,
      plannerOps:
        databaseChanges.planner.create.length +
        databaseChanges.planner.update.length +
        databaseChanges.planner.destroy.length,
      calendarOps:
        databaseChanges.calendar.create.length +
        databaseChanges.calendar.update.length +
        databaseChanges.calendar.destroy.length,
    });

    await db.$transaction(operations);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to sync planner and calendar data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
