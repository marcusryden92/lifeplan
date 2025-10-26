import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
type Database = typeof import("@/lib/db").db;

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
  for (const plannerUpdate of databaseChanges.planner.update) {
    const { userId: _userId, ...rest } = plannerUpdate;
    operations.push(
      db.planner.update({
        where: { id: plannerUpdate.id },
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
