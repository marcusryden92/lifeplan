import type { Prisma } from "@/prisma/client";
import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
import { intToWeekday } from "@/utils/calendarUtils";
import type { EventTemplate } from "@/types/prisma";
type Database = Prisma.TransactionClient;

// App holds startDay as WeekDayIntegers; DB expects the WeekDayType enum string.
function templateForWrite(template: EventTemplate) {
  return {
    ...template,
    startDay: intToWeekday(template.startDay),
  };
}

export function handleTemplateChanges(
  db: Database,
  userId: string,
  databaseChanges: DatabaseChanges,
  updatedAt: string
) {
  const operations = [];

  // CREATE
  if (databaseChanges.template.create.length) {
    operations.push(
      db.eventTemplate.createMany({
        data: databaseChanges.template.create.map((template) => ({
          ...templateForWrite(template),
          userId,
        })),
        skipDuplicates: true,
      })
    );
  }

  // UPDATE
  for (const template of databaseChanges.template.update) {
    operations.push(
      db.eventTemplate.update({
        where: { id: template.id },
        data: { ...templateForWrite(template), userId, updatedAt },
      })
    );
  }

  // DELETE
  if (databaseChanges.template.destroy.length) {
    operations.push(
      db.eventTemplate.deleteMany({
        where: {
          id: { in: databaseChanges.template.destroy.map((t) => t.id) },
        },
      })
    );
  }

  return operations;
}
