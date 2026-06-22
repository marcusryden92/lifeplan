import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
type Database = typeof import("@/lib/db").db;

export function handleTimeWindowChanges(
  db: Database,
  userId: string,
  databaseChanges: DatabaseChanges,
) {
  const operations = [];

  if (databaseChanges.categoryTimeWindow.create.length) {
    operations.push(
      db.categoryTimeWindow.createMany({
        data: databaseChanges.categoryTimeWindow.create.map((w) => ({
          id: w.id,
          day: w.day,
          startTime: w.startTime,
          endTime: w.endTime,
          categoryId: w.categoryId,
          userId,
        })),
        skipDuplicates: true,
      }),
    );
  }

  for (const w of databaseChanges.categoryTimeWindow.update) {
    operations.push(
      db.categoryTimeWindow.update({
        where: { id: w.id },
        data: {
          day: w.day,
          startTime: w.startTime,
          endTime: w.endTime,
          categoryId: w.categoryId,
        },
      }),
    );
  }

  if (databaseChanges.categoryTimeWindow.destroy.length) {
    operations.push(
      db.categoryTimeWindow.deleteMany({
        where: {
          id: {
            in: databaseChanges.categoryTimeWindow.destroy.map((w) => w.id),
          },
        },
      }),
    );
  }

  return operations;
}
