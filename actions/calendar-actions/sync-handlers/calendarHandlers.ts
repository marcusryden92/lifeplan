import type { Prisma } from "@/generated/client";
import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
type Database = Prisma.TransactionClient;

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
  // updateMany is a no-op on missing rows instead of throwing P2025, so a
  // stale ghost id in previousCalendar (e.g. another tab deleted the row, or
  // an overlapping sync drifted the ref) doesn't abort the whole transaction.
  // Scoping by userId also prevents cross-user writes.
  for (const event of databaseChanges.calendar.update) {
    const { id, ...rest } = event;
    operations.push(
      db.simpleEvent.updateMany({
        where: { id, userId },
        data: { ...rest, updatedAt },
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
