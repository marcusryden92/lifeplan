import type { Prisma } from "@/prisma/client";
import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
type Database = Prisma.TransactionClient;

export function handleTravelEventChanges(
  db: Database,
  userId: string,
  databaseChanges: DatabaseChanges,
) {
  const operations = [];

  if (databaseChanges.travelEvent.create.length) {
    operations.push(
      db.travelEvent.createMany({
        data: databaseChanges.travelEvent.create.map((e) => ({
          id: e.id,
          start: e.start,
          end: e.end,
          fromLocationId: e.fromLocationId,
          toLocationId: e.toLocationId,
          travelMinutes: e.travelMinutes,
          requiredTravelMinutes: e.requiredTravelMinutes,
          insufficientTravel: e.insufficientTravel,
          overconstrained: e.overconstrained,
          userId,
          updatedAt: new Date().toISOString(),
        })),
        skipDuplicates: true,
      }),
    );
  }

  for (const e of databaseChanges.travelEvent.update) {
    operations.push(
      db.travelEvent.update({
        where: { id: e.id },
        data: {
          start: e.start,
          end: e.end,
          fromLocationId: e.fromLocationId,
          toLocationId: e.toLocationId,
          travelMinutes: e.travelMinutes,
          requiredTravelMinutes: e.requiredTravelMinutes,
          insufficientTravel: e.insufficientTravel,
          overconstrained: e.overconstrained,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
  }

  if (databaseChanges.travelEvent.destroy.length) {
    operations.push(
      db.travelEvent.deleteMany({
        where: {
          id: { in: databaseChanges.travelEvent.destroy.map((e) => e.id) },
        },
      }),
    );
  }

  return operations;
}
