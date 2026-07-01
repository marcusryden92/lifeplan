import type { Prisma } from "@/generated/client";
import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
type Database = Prisma.TransactionClient;

/**
 * EngineMessage rows are engine-derived. Dismissal is a `dismissed` field
 * flip that flows through the update path; there is no separate delete
 * edge for dismissal (the row survives so the engine can carry the flag
 * forward on the next regen).
 *
 * Batching model:
 *   - creates → `createMany` (default createdAt fires; type/tone/payload/
 *     dismissed set)
 *   - updates → per-row `update` (preserves createdAt so row-age is stable
 *     across payload / dismissal changes)
 *   - deletes → `deleteMany` on ids (fires when the engine stops emitting
 *     the row entirely — the situation resolved)
 */
export function handleEngineMessageChanges(
  db: Database,
  userId: string,
  databaseChanges: DatabaseChanges,
) {
  const operations: Promise<unknown>[] = [];
  const now = new Date().toISOString();

  const updates = databaseChanges.engineMessage.update;
  const creates = databaseChanges.engineMessage.create;
  const destroys = databaseChanges.engineMessage.destroy;

  if (destroys.length) {
    operations.push(
      db.engineMessage.deleteMany({
        where: { id: { in: destroys.map((m) => m.id) } },
      }),
    );
  }

  if (creates.length) {
    operations.push(
      db.engineMessage.createMany({
        data: creates.map((m) => ({
          id: m.id,
          type: m.type,
          tone: m.tone,
          payload: m.payload as Prisma.InputJsonValue,
          dismissed: m.dismissed,
          userId,
          updatedAt: now,
        })),
      }),
    );
  }

  for (const m of updates) {
    operations.push(
      db.engineMessage.update({
        where: { id: m.id },
        data: {
          type: m.type,
          tone: m.tone,
          payload: m.payload as Prisma.InputJsonValue,
          dismissed: m.dismissed,
          updatedAt: now,
        },
      }),
    );
  }

  return operations;
}
