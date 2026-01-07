import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
type Database = typeof import("@/lib/db").db;

export function handleExtendedPropsChanges(
  db: Database,
  databaseChanges: DatabaseChanges
) {
  const operations = [];

  // CREATE
  if (databaseChanges.extendedProps.create.length) {
    operations.push(
      db.eventExtendedProps.createMany({
        data: databaseChanges.extendedProps.create.map((props) => {
          // Strip runtime-only fields that don't exist in database schema
          const { categoryWrapperId, wrapperId, ...dbProps } = props as any;
          return dbProps;
        }),
        skipDuplicates: true,
      })
    );
  }

  // UPDATE
  for (const props of databaseChanges.extendedProps.update) {
    // Strip runtime-only fields that don't exist in database schema
    const { id: propsId, categoryWrapperId, wrapperId, ...rest } = props as any;
    operations.push(
      db.eventExtendedProps.upsert({
        where: { eventId: props.eventId },
        update: { ...rest },
        create: {
          id: propsId ?? props.eventId,
          ...rest,
        },
      })
    );
  }

  // DELETE
  if (databaseChanges.extendedProps.destroy.length) {
    operations.push(
      db.eventExtendedProps.deleteMany({
        where: {
          id: { in: databaseChanges.extendedProps.destroy.map((p) => p.id) },
        },
      })
    );
  }

  return operations;
}
