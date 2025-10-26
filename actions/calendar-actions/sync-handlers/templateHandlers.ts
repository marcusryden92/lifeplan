import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
type Database = typeof import("@/lib/db").db;

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
          ...template,
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
        data: { ...template, userId, updatedAt },
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
