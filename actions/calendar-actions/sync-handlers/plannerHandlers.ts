import type { Prisma } from "@/generated/client";
import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
type Database = Prisma.TransactionClient;

export function handlePlannerChanges(
  db: Database,
  userId: string,
  databaseChanges: DatabaseChanges,
  updatedAt: string
) {
  const operations = [];

  // CREATE
  if (databaseChanges.planner.create.length) {
    operations.push(
      db.planner.createMany({
        data: databaseChanges.planner.create.map((planner) => ({
          ...planner,
          userId,
        })),
        skipDuplicates: true,
      })
    );
  }

  // UPDATE
  // updateMany is a no-op on missing rows instead of throwing P2025, so a
  // stale ghost id in previousPlanner doesn't abort the whole transaction.
  // Scoping by userId also prevents cross-user writes.
  for (const plannerUpdate of databaseChanges.planner.update) {
    const { id, userId: _userId, ...rest } = plannerUpdate;
    operations.push(
      db.planner.updateMany({
        where: { id, userId },
        data: { ...rest, updatedAt },
      })
    );
  }

  // DELETE
  if (databaseChanges.planner.destroy.length) {
    operations.push(
      db.planner.deleteMany({
        where: { id: { in: databaseChanges.planner.destroy.map((p) => p.id) } },
      })
    );
  }

  return operations;
}
