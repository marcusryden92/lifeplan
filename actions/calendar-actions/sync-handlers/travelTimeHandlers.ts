import type { Prisma } from "@/generated/client";
import { DatabaseChanges } from "@/utils/server-handlers/compareCalendarData";
type Database = Prisma.TransactionClient;

// Travel times only flow through the diff for custom override updates.
// Create requires a Google distance lookup (refreshAllTravelTimes /
// fetchMissingTravelTimes own that path) and destroy happens by Prisma
// cascade when a location is deleted. Google base fields (rush/regular/
// night minutes, transport mode, identity) are server-authoritative and
// never written from the diff.
export function handleTravelTimeChanges(
  db: Database,
  userId: string,
  databaseChanges: DatabaseChanges,
) {
  const operations = [];

  for (const tt of databaseChanges.travelTime.update) {
    operations.push(
      db.travelTime.update({
        where: { id: tt.id, userId },
        data: {
          customRushHourMinutes: tt.customRushHourMinutes,
          customRegularMinutes: tt.customRegularMinutes,
          customNightMinutes: tt.customNightMinutes,
        },
      }),
    );
  }

  return operations;
}
