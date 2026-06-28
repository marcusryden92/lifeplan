import type { EventInput } from "@fullcalendar/core/index.js";
import { EventTemplate, EventType } from "@/types/prisma";
import { calendarColors } from "@/data/calendarColors";

const RRULE_WEEKDAY_BY_INDEX = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

// Converts EventTemplate configuration directly into FullCalendar EventInput
// with RRule. No shadow SimpleEvents — the renderer reads EventTemplate as
// the source of truth, so editing a template appears immediately without
// going through the engine.
export function templatesToEventInput(
  templates: EventTemplate[],
): EventInput[] {
  const events: EventInput[] = [];
  for (const template of templates) {
    if (
      template.startDay === null ||
      template.startDay === undefined ||
      !template.startTime ||
      template.duration === undefined
    ) {
      continue;
    }

      const [hours, minutes] = template.startTime.split(":").map(Number);
      const today = new Date();
      // Anchor dtstart on the most recent occurrence of the template's
      // startDay so RRule has a concrete point to expand from. The actual
      // weekly recurrence is what FullCalendar renders — the anchor date
      // just sets the time-of-day.
      const dayOffset = (today.getDay() - template.startDay + 7) % 7;
      const anchor = new Date(today);
      anchor.setDate(anchor.getDate() - dayOffset);
      anchor.setHours(hours, minutes, 0, 0);
      const pad = (n: number) => String(n).padStart(2, "0");
      const dtstart =
        `${anchor.getFullYear()}-${pad(anchor.getMonth() + 1)}-${pad(anchor.getDate())}` +
        `T${pad(anchor.getHours())}:${pad(anchor.getMinutes())}:00`;

      const rrule = {
        freq: "weekly",
        interval: 1,
        byweekday: [RRULE_WEEKDAY_BY_INDEX[template.startDay]],
        dtstart,
      };

      const durationMs = template.duration * 60 * 1000;
      const durationHours = Math.floor(durationMs / 3600000);
      const durationMinutes = Math.floor((durationMs % 3600000) / 60000);
      const durationStr = `${pad(durationHours)}:${pad(durationMinutes)}:00`;

    events.push({
      id: template.id,
      title: template.title,
      rrule,
      duration: durationStr,
      backgroundColor: (template.color as string) || calendarColors[0],
      borderColor: "transparent",
      editable: false,
      extendedProps: {
        eventType: EventType.template,
        eventId: template.id,
        plannerType: null,
        completedStartTime: null,
        completedEndTime: null,
        parentId: null,
        isTemplateItem: true,
      },
    });
  }
  return events;
}
