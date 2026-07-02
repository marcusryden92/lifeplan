"use server";

import { db } from "@/lib/db";
import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
import { handlePlannerChanges } from "./sync-handlers/plannerHandlers";
import { handleCalendarChanges } from "./sync-handlers/calendarHandlers";
import { handleExtendedPropsChanges } from "./sync-handlers/extendedPropsHandlers";
import { handleTemplateChanges } from "./sync-handlers/templateHandlers";
import { handleCategoryChanges } from "./sync-handlers/categoryHandlers";
import { handleTimeWindowChanges } from "./sync-handlers/timeWindowHandlers";
import { handleCategoryEventChanges } from "./sync-handlers/categoryEventHandlers";
import { handleTravelEventChanges } from "./sync-handlers/travelEventHandlers";
import { handleEngineMessageChanges } from "./sync-handlers/engineMessageHandlers";
import { handleLocationChanges } from "./sync-handlers/locationHandlers";
import { handleTravelTimeChanges } from "./sync-handlers/travelTimeHandlers";
import { fetchFreshState, type FreshState } from "./fetchFreshState";

// Sentinel error used inside the interactive transaction to abort + roll back
// when the client's dataVersion doesn't match the server's. The catch block
// upstream maps this into a structured response rather than a thrown error.
class StaleVersionError extends Error {
  constructor() {
    super("stale");
    this.name = "StaleVersionError";
  }
}

export type SyncResponse =
  | { success: true; newDataVersion: number }
  | { success: false; reason: "stale"; freshState: FreshState }
  | { success: false; reason: "error"; error: string };

export async function syncCalendarData(
  userId: string,
  databaseChanges: DatabaseChanges,
  clientKnownDataVersion: number,
): Promise<SyncResponse> {
  const now = new Date();
  const updatedAt = now.toISOString();

  try {
    const newDataVersion = await db.$transaction(
      async (tx) => {
        // OCC gate. updateMany returns count: 0 if the user row doesn't exist OR
        // if dataVersion has moved on since the client read it. Either way we
        // abort the transaction (rolling back any prior ops) and let the upstream
        // catch block return the fresh state to the client.
        const versionBump = await tx.user.updateMany({
          where: { id: userId, dataVersion: clientKnownDataVersion },
          data: { dataVersion: { increment: 1 } },
        });
        if (versionBump.count === 0) {
          throw new StaleVersionError();
        }

        const operations = [
          ...handlePlannerChanges(tx, userId, databaseChanges, updatedAt),
          ...handleCalendarChanges(tx, userId, databaseChanges, updatedAt),
          ...handleExtendedPropsChanges(tx, databaseChanges),
          ...handleTemplateChanges(tx, userId, databaseChanges, updatedAt),
          ...handleCategoryChanges(tx, userId, databaseChanges, updatedAt),
          ...handleTimeWindowChanges(tx, userId, databaseChanges),
          ...handleCategoryEventChanges(tx, userId, databaseChanges),
          ...handleTravelEventChanges(tx, userId, databaseChanges),
          ...handleEngineMessageChanges(tx, userId, databaseChanges),
          ...handleLocationChanges(tx, userId, databaseChanges),
          ...handleTravelTimeChanges(tx, userId, databaseChanges),
        ];

        // Sequential execution matches the previous array-form semantics so
        // ordering invariants (e.g. SimpleEvent must exist before ExtendedProps
        // upsert connects to it) still hold.
        for (const op of operations) {
          await op;
        }

        return clientKnownDataVersion + 1;
      },
      {
        // The first regen after a fresh load runs hundreds of writes:
        // CategoryEvent creates for every materialized weekly occurrence on top
        // of the usual planner/calendar/extendedProps churn. Prisma's 5s
        // interactive-transaction default tips over here. AI-coach saves on a
        // large goal restructure hit the same shape (many planner ops + full
        // engine regen), so 60s gives steady headroom. Long syncs are still
        // bounded so a runaway diff can't block the connection indefinitely.
        timeout: 60_000,
      },
    );

    console.log("📊 Sync operations:", {
      newDataVersion,
      plannerOps:
        databaseChanges.planner.create.length +
        databaseChanges.planner.update.length +
        databaseChanges.planner.destroy.length,
      calendarOps:
        databaseChanges.calendar.create.length +
        databaseChanges.calendar.update.length +
        databaseChanges.calendar.destroy.length,
    });

    return { success: true, newDataVersion };
  } catch (error) {
    if (error instanceof StaleVersionError) {
      const freshState = await fetchFreshState(userId);
      return { success: false, reason: "stale", freshState };
    }
    console.error("❌ Failed to sync planner and calendar data:", error);
    return {
      success: false,
      reason: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
