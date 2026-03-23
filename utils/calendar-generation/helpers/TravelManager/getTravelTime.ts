import { TravelTimeEntry } from "../../models/SchedulingModels";

export function getTravelTime(
  travelTimeMatrix: Map<string, TravelTimeEntry> | null,
  fromLocationId: string | null,
  toLocationId: string | null,
  timeOfDay: Date,
): number {
  if (!fromLocationId || !toLocationId || fromLocationId === toLocationId) {
    return 0;
  }

  if (!travelTimeMatrix) {
    return 0;
  }

  const travelKey = `${fromLocationId}->${toLocationId}`;
  const entry = travelTimeMatrix.get(travelKey);

  if (!entry) {
    return 0;
  }

  const hour = timeOfDay.getHours();

  if ((hour >= 7 && hour < 9) || (hour >= 16 && hour < 19)) {
    return entry.rushHourMinutes;
  } else if (hour >= 22 || hour < 6) {
    return entry.nightMinutes;
  } else {
    return entry.regularMinutes;
  }
}
