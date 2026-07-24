import type { ExternalCalendarSource } from "@/types/prisma";

export const EXTERNAL_CALENDAR_REFRESH_TTL_MS = 60 * 60 * 1000;

// How far the refresh materializes occurrences. Past events only matter for
// display; future coverage comfortably exceeds the engine's search horizon.
export const EXTERNAL_EVENT_PAST_WINDOW_DAYS = 30;
export const EXTERNAL_EVENT_FUTURE_WINDOW_DAYS = 180;

export function externalSourceNeedsRefresh(
  source: Pick<ExternalCalendarSource, "enabled" | "lastFetchedAt">,
  now: Date,
): boolean {
  if (!source.enabled) return false;
  if (!source.lastFetchedAt) return true;
  return (
    now.getTime() - new Date(source.lastFetchedAt).getTime() >=
    EXTERNAL_CALENDAR_REFRESH_TTL_MS
  );
}
