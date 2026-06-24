import type { Prisma } from "@/prisma/client";
import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
type Database = Prisma.TransactionClient;

export function handleCategoryChanges(
  db: Database,
  userId: string,
  databaseChanges: DatabaseChanges,
  updatedAt: string,
) {
  const operations = [];

  if (databaseChanges.category.create.length) {
    operations.push(
      db.category.createMany({
        data: databaseChanges.category.create.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
          sortOrder: c.sortOrder,
          isStrict: c.isStrict,
          useTimeWindows: c.useTimeWindows,
          locationId: c.locationId,
          parentId: c.parentId,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          userId,
        })),
        skipDuplicates: true,
      }),
    );
  }

  for (const c of databaseChanges.category.update) {
    operations.push(
      db.category.update({
        where: { id: c.id },
        data: {
          name: c.name,
          icon: c.icon,
          color: c.color,
          sortOrder: c.sortOrder,
          isStrict: c.isStrict,
          useTimeWindows: c.useTimeWindows,
          locationId: c.locationId,
          parentId: c.parentId,
          updatedAt,
        },
      }),
    );
  }

  if (databaseChanges.category.destroy.length) {
    operations.push(
      db.category.deleteMany({
        where: {
          id: { in: databaseChanges.category.destroy.map((c) => c.id) },
        },
      }),
    );
  }

  return operations;
}
