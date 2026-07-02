import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
import type { Prisma } from "@/generated/client";
type Database = Prisma.TransactionClient;

export function handleExtendedPropsChanges(
  db: Database,
  databaseChanges: DatabaseChanges,
) {
  const operations = [];

  // CREATE
  if (databaseChanges.extendedProps.create.length) {
    const cleanData: Prisma.EventExtendedPropsCreateManyInput[] =
      databaseChanges.extendedProps.create.map((props) => ({
        id: props.id,
        eventId: props.eventId,
        plannerType: props.plannerType,
        eventType: props.eventType,
        parentId: props.parentId,
        completedStartTime: props.completedStartTime,
        completedEndTime: props.completedEndTime,
      }));

    operations.push(
      db.eventExtendedProps.createMany({
        data: cleanData,
        skipDuplicates: true,
      }),
    );
  }

  // UPSERT — one INSERT ... ON CONFLICT (eventId) DO UPDATE statement covers
  // every update row in a single round-trip. Previously this looped per-row
  // upsert, which meant N × (SELECT + INSERT-or-UPDATE) round-trips against
  // Postgres. Note: eventType is intentionally omitted from the DO UPDATE SET
  // clause — it's set on create only, matching the previous handler shape.
  if (databaseChanges.extendedProps.update.length) {
    const params: unknown[] = [];
    const rowFragments: string[] = [];
    for (const props of databaseChanges.extendedProps.update) {
      const cells: string[] = [];
      params.push(props.id);
      cells.push(`$${params.length}::text`);
      params.push(props.eventId);
      cells.push(`$${params.length}::text`);
      params.push(props.plannerType);
      cells.push(`$${params.length}::"PlannerType"`);
      params.push(props.eventType);
      cells.push(`$${params.length}::"EventType"`);
      params.push(props.parentId);
      cells.push(`$${params.length}::text`);
      params.push(props.completedStartTime);
      cells.push(`$${params.length}::text`);
      params.push(props.completedEndTime);
      cells.push(`$${params.length}::text`);
      rowFragments.push(`(${cells.join(",")})`);
    }

    const query = `
      INSERT INTO "EventExtendedProps" (
        id, "eventId", "plannerType", "eventType", "parentId",
        "completedStartTime", "completedEndTime"
      )
      VALUES ${rowFragments.join(",")}
      ON CONFLICT ("eventId") DO UPDATE SET
        "plannerType" = EXCLUDED."plannerType",
        "parentId" = EXCLUDED."parentId",
        "completedStartTime" = EXCLUDED."completedStartTime",
        "completedEndTime" = EXCLUDED."completedEndTime"
    `;

    operations.push(db.$executeRawUnsafe(query, ...params));
  }

  // DELETE
  if (databaseChanges.extendedProps.destroy.length) {
    operations.push(
      db.eventExtendedProps.deleteMany({
        where: {
          id: { in: databaseChanges.extendedProps.destroy.map((p) => p.id) },
        },
      }),
    );
  }

  return operations;
}
