import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
type Database = typeof import("@/lib/db").db;

export function handleCalendarChanges(
  db: Database,
  userId: string,
  databaseChanges: DatabaseChanges,
  updatedAt: string
) {
  const operations = [];

  // CREATE
  if (databaseChanges.calendar.create.length) {
    operations.push(
      db.simpleEvent.createMany({
        data: databaseChanges.calendar.create.map((event) => ({
          ...event,
          userId,
        })),
        skipDuplicates: true,
      })
    );
  }

  // UPDATE
  for (const event of databaseChanges.calendar.update) {
    operations.push(
      db.simpleEvent.update({
        where: { id: event.id },
        data: { ...event, userId, updatedAt },
      })
    );
  }

  // DELETE
  if (databaseChanges.calendar.destroy.length) {
    operations.push(
      db.simpleEvent.deleteMany({
        where: {
          id: { in: databaseChanges.calendar.destroy.map((e) => e.id) },
        },
      })
    );
  }

  return operations;
}
