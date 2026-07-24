"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  ExternalCalendarKind,
  ExternalCalendarMode,
  type ExternalCalendarSource,
  type ExternalEvent,
} from "@/types/prisma";
import { parseIcsFeed } from "@/utils/external-calendar/parseIcsFeed";
import {
  normalizeIcsUrl,
  googleShareLinkCalendarId,
  googlePublicIcsUrl,
} from "@/utils/external-calendar/icsUrl";
import { toggleModeException } from "@/utils/external-calendar/modeExceptions";
import {
  EXTERNAL_EVENT_PAST_WINDOW_DAYS,
  EXTERNAL_EVENT_FUTURE_WINDOW_DAYS,
} from "@/utils/external-calendar/refreshPolicy";

type SourceRow = Awaited<
  ReturnType<typeof db.externalCalendarSource.findFirstOrThrow>
>;

function serializeSource(row: SourceRow): ExternalCalendarSource {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastFetchedAt: row.lastFetchedAt ? row.lastFetchedAt.toISOString() : null,
  };
}

function expansionWindow(now: Date): { windowStart: Date; windowEnd: Date } {
  const dayMs = 24 * 60 * 60 * 1000;
  return {
    windowStart: new Date(
      now.getTime() - EXTERNAL_EVENT_PAST_WINDOW_DAYS * dayMs,
    ),
    windowEnd: new Date(
      now.getTime() + EXTERNAL_EVENT_FUTURE_WINDOW_DAYS * dayMs,
    ),
  };
}

async function fetchIcsText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
      headers: { Accept: "text/calendar, text/plain, */*" },
    });
    if (!response.ok) {
      throw new Error(`The feed responded with status ${response.status}`);
    }
    const text = await response.text();
    if (text.length > 10_000_000) {
      throw new Error("The feed is too large to import");
    }
    if (!/BEGIN:VCALENDAR/i.test(text)) {
      throw new Error(
        /<(!doctype|html)/i.test(text)
          ? "The URL returned a web page, not a calendar feed — look for a link ending in .ics (in Google Calendar: the “Secret address in iCal format”)"
          : "The URL did not return an ICS calendar feed",
      );
    }
    return text;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The feed took too long to respond");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

export async function fetchExternalCalendarData(): Promise<
  | {
      success: true;
      sources: ExternalCalendarSource[];
      events: ExternalEvent[];
    }
  | { success: false; error: string }
> {
  try {
    const userId = await requireUserId();
    const [sources, events] = await Promise.all([
      db.externalCalendarSource.findMany({ where: { userId } }),
      db.externalEvent.findMany({ where: { userId } }),
    ]);
    return {
      success: true,
      sources: sources.map(serializeSource),
      events,
    };
  } catch (error) {
    console.error("Failed to fetch external calendar data:", error);
    return { success: false, error: "Failed to fetch external calendars" };
  }
}

export async function addExternalCalendarSource(input: {
  url: string;
  name?: string;
  color?: string | null;
  mode?: ExternalCalendarMode;
}): Promise<
  | {
      success: true;
      source: ExternalCalendarSource;
      events: ExternalEvent[];
    }
  | { success: false; error: string }
> {
  try {
    const userId = await requireUserId();
    let url = normalizeIcsUrl(input.url);
    if (!url) {
      return { success: false, error: "That doesn't look like a valid URL" };
    }

    let icsText: string;
    const shareCalendarId = googleShareLinkCalendarId(url);
    if (shareCalendarId) {
      // A Google sharing link is an HTML page; try the calendar's public
      // feed, and when the calendar isn't public, name the exact fix.
      const publicUrl = googlePublicIcsUrl(shareCalendarId);
      try {
        icsText = await fetchIcsText(publicUrl);
        url = publicUrl;
      } catch {
        return {
          success: false,
          error:
            "That's a Google Calendar sharing link, and this calendar isn't public. In Google Calendar on the web, open Settings, pick the calendar under “Settings for my calendars”, scroll to “Integrate calendar”, and copy the “Secret address in iCal format” — paste that .ics link here.",
        };
      }
    } else {
      icsText = await fetchIcsText(url);
    }
    const now = new Date();
    const { windowStart, windowEnd } = expansionWindow(now);

    const created = await db.externalCalendarSource.create({
      data: {
        userId,
        kind: ExternalCalendarKind.ICS,
        url,
        name: input.name?.trim() || "Imported calendar",
        color: input.color ?? null,
        mode: input.mode ?? ExternalCalendarMode.BUSY,
        lastFetchedAt: now,
      },
    });

    const { events, calendarName } = parseIcsFeed({
      icsText,
      sourceId: created.id,
      userId,
      windowStart,
      windowEnd,
    });

    const finalName =
      input.name?.trim() || calendarName?.trim() || "Imported calendar";
    const [source] = await db.$transaction([
      db.externalCalendarSource.update({
        where: { id: created.id },
        data: { name: finalName },
      }),
      db.externalEvent.createMany({ data: events }),
    ]);

    return { success: true, source: serializeSource(source), events };
  } catch (error) {
    console.error("Failed to add external calendar:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to add the calendar",
    };
  }
}

export async function refreshExternalCalendarSource(sourceId: string): Promise<
  | {
      success: true;
      source: ExternalCalendarSource;
      events: ExternalEvent[];
    }
  | { success: false; error: string; source?: ExternalCalendarSource }
> {
  try {
    const userId = await requireUserId();
    const existing = await db.externalCalendarSource.findFirst({
      where: { id: sourceId, userId },
    });
    if (!existing) return { success: false, error: "Calendar not found" };

    try {
      const icsText = await fetchIcsText(existing.url);
      const now = new Date();
      const { windowStart, windowEnd } = expansionWindow(now);
      const { events } = parseIcsFeed({
        icsText,
        sourceId: existing.id,
        userId,
        windowStart,
        windowEnd,
      });

      const [, , source] = await db.$transaction([
        db.externalEvent.deleteMany({ where: { sourceId: existing.id } }),
        db.externalEvent.createMany({ data: events }),
        db.externalCalendarSource.update({
          where: { id: existing.id },
          data: { lastFetchedAt: now, lastError: null },
        }),
      ]);

      return { success: true, source: serializeSource(source), events };
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to refresh the feed";
      const source = await db.externalCalendarSource.update({
        where: { id: existing.id },
        data: { lastError: message },
      });
      return { success: false, error: message, source: serializeSource(source) };
    }
  } catch (error) {
    console.error("Failed to refresh external calendar:", error);
    return { success: false, error: "Failed to refresh the calendar" };
  }
}

export async function updateExternalCalendarSource(
  sourceId: string,
  patch: {
    name?: string;
    color?: string | null;
    mode?: ExternalCalendarMode;
    enabled?: boolean;
  },
): Promise<
  | { success: true; source: ExternalCalendarSource }
  | { success: false; error: string }
> {
  try {
    const userId = await requireUserId();
    const { count } = await db.externalCalendarSource.updateMany({
      where: { id: sourceId, userId },
      data: patch,
    });
    if (count === 0) return { success: false, error: "Calendar not found" };
    const source = await db.externalCalendarSource.findFirstOrThrow({
      where: { id: sourceId, userId },
    });
    return { success: true, source: serializeSource(source) };
  } catch (error) {
    console.error("Failed to update external calendar:", error);
    return { success: false, error: "Failed to update the calendar" };
  }
}

export async function deleteExternalCalendarSource(
  sourceId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    const { count } = await db.externalCalendarSource.deleteMany({
      where: { id: sourceId, userId },
    });
    if (count === 0) return { success: false, error: "Calendar not found" };
    return { success: true };
  } catch (error) {
    console.error("Failed to delete external calendar:", error);
    return { success: false, error: "Failed to remove the calendar" };
  }
}

export async function toggleExternalEventBusyException(
  sourceId: string,
  uid: string,
): Promise<
  | { success: true; source: ExternalCalendarSource }
  | { success: false; error: string }
> {
  try {
    const userId = await requireUserId();
    const existing = await db.externalCalendarSource.findFirst({
      where: { id: sourceId, userId },
    });
    if (!existing) return { success: false, error: "Calendar not found" };
    const source = await db.externalCalendarSource.update({
      where: { id: existing.id },
      data: { modeExceptions: toggleModeException(existing.modeExceptions, uid) },
    });
    return { success: true, source: serializeSource(source) };
  } catch (error) {
    console.error("Failed to toggle external event exception:", error);
    return { success: false, error: "Failed to update the event" };
  }
}
