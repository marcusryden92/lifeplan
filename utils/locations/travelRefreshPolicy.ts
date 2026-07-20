// Freshness policy for cached Google travel times. Pure so the server actions
// stay thin wiring and the decisions are unit-testable.

export const TRAVEL_TIME_TTL_MS = 180 * 24 * 60 * 60 * 1000;
export const UNROUTABLE_RETRY_MS = 30 * 24 * 60 * 60 * 1000;
export const REFRESH_ALL_COOLDOWN_MS = 60 * 60 * 1000;
// Cap on the silent background top-up: bounds what a returning user's page
// load may spend, no matter how stale the cache is. Remaining stale pairs top
// up incrementally across sessions.
export const STALE_TOP_UP_MAX_PAIRS = 10;
export const TOP_UP_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Persisted per-user daily allowance for the silent top-up — sessions are
// free to create (refresh, second tab, phone), so the per-session cap alone
// would not bound spend.
export function topUpAllowed(now: number, lastTopUpAt: Date | null): boolean {
  return !lastTopUpAt || now - lastTopUpAt.getTime() >= TOP_UP_COOLDOWN_MS;
}

export interface TravelTimeFreshness {
  updatedAt: Date;
  unroutableAt: Date | null;
}

// True when a cached row should be bought again: routable rows age out after
// the TTL (traffic patterns and timetables drift), unroutable rows after a
// longer retry window (a pair with no route rarely gains one).
export function needsRefetch(row: TravelTimeFreshness, now: number): boolean {
  if (row.unroutableAt) {
    return now - row.unroutableAt.getTime() >= UNROUTABLE_RETRY_MS;
  }
  return now - row.updatedAt.getTime() >= TRAVEL_TIME_TTL_MS;
}

export type RefreshAllVerdict =
  | { allowed: true }
  | { allowed: false; reason: string };

// Two separate concerns, deliberately not one timestamp: `lastRefreshAt` is a
// mode-independent rate limit on the action itself (a full recompute is the
// most expensive call in the app), and `oldestUpdatedAt` is a staleness check
// on the target mode's data — keyed on the OLDEST row, so one freshly fetched
// pair can't mask a cache full of stale ones.
export function refreshAllGate(args: {
  now: number;
  lastRefreshAt: Date | null;
  oldestUpdatedAt: Date | null;
}): RefreshAllVerdict {
  if (
    args.lastRefreshAt &&
    args.now - args.lastRefreshAt.getTime() < REFRESH_ALL_COOLDOWN_MS
  ) {
    return {
      allowed: false,
      reason:
        "Travel times were refreshed less than an hour ago — try again later.",
    };
  }
  if (
    args.oldestUpdatedAt &&
    args.now - args.oldestUpdatedAt.getTime() < REFRESH_ALL_COOLDOWN_MS
  ) {
    return {
      allowed: false,
      reason:
        "All travel times for this mode are under an hour old — use Fetch missing on the Locations page for new pairs.",
    };
  }
  return { allowed: true };
}
