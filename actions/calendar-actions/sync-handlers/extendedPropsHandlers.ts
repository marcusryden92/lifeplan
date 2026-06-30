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

  // UPDATE
  for (const props of databaseChanges.extendedProps.update) {
    const updateData: Prisma.EventExtendedPropsUpdateInput = {
      plannerType: props.plannerType,
      parentId: props.parentId,
      completedStartTime: props.completedStartTime,
      completedEndTime: props.completedEndTime,
    };

    const createData: Prisma.EventExtendedPropsCreateInput = {
      id: props.id,
      event: { connect: { id: props.eventId } },
      plannerType: props.plannerType,
      eventType: props.eventType,
      parentId: props.parentId,
      completedStartTime: props.completedStartTime,
      completedEndTime: props.completedEndTime,
    };

    operations.push(
      db.eventExtendedProps.upsert({
        where: { eventId: props.eventId },
        update: updateData,
        create: createData,
      }),
    );
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
