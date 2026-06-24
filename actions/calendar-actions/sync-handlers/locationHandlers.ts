import type { Prisma } from "@/prisma/client";
import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
type Database = Prisma.TransactionClient;

// Locations only get simple name updates and deletes through the sync.
// Creation goes through actions/locations.ts because it needs a Google Places
// API lookup to populate address/lat/lng/placeId — those aren't known
// client-side at dispatch time. After a direct create, the page is expected to
// dispatch the returned Location to Redux AND mark it synced via the sync
// hook so the diff doesn't try to re-create it on the next pass.
export function handleLocationChanges(
  db: Database,
  userId: string,
  databaseChanges: DatabaseChanges,
) {
  const operations = [];

  for (const loc of databaseChanges.location.update) {
    operations.push(
      db.location.update({
        where: { id: loc.id, userId },
        data: { name: loc.name },
      }),
    );
  }

  if (databaseChanges.location.destroy.length) {
    operations.push(
      db.location.deleteMany({
        where: {
          userId,
          id: { in: databaseChanges.location.destroy.map((l) => l.id) },
        },
      }),
    );
  }

  return operations;
}
