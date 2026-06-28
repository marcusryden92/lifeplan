import type { Prisma } from "@/prisma/client";
import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
type Database = Prisma.TransactionClient;

export function handleCategoryEventChanges(
  db: Database,
  userId: string,
  databaseChanges: DatabaseChanges,
) {
  const operations = [];

  if (databaseChanges.categoryEvent.create.length) {
    operations.push(
      db.categoryEvent.createMany({
        data: databaseChanges.categoryEvent.create.map((e) => ({
          id: e.id,
          start: e.start,
          end: e.end,
          trespassingStart: e.trespassingStart,
          trespassingEnd: e.trespassingEnd,
          categoryTimeWindowId: e.categoryTimeWindowId,
          categoryId: e.categoryId,
          userId,
          updatedAt: new Date().toISOString(),
        })),
        skipDuplicates: true,
      }),
    );
  }

  for (const e of databaseChanges.categoryEvent.update) {
    operations.push(
      db.categoryEvent.update({
        where: { id: e.id },
        data: {
          start: e.start,
          end: e.end,
          trespassingStart: e.trespassingStart,
          trespassingEnd: e.trespassingEnd,
          categoryTimeWindowId: e.categoryTimeWindowId,
          categoryId: e.categoryId,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
  }

  if (databaseChanges.categoryEvent.destroy.length) {
    operations.push(
      db.categoryEvent.deleteMany({
        where: {
          id: { in: databaseChanges.categoryEvent.destroy.map((e) => e.id) },
        },
      }),
    );
  }

  return operations;
}
