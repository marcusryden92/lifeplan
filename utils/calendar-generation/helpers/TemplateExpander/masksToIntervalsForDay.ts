import { PerTemplateMask } from "../../models/TemplateModels";

export function masksToIntervalsForDay(
  masks: PerTemplateMask[],
  date: Date,
): Array<{ start: Date; end: Date }> {
  const dayOfWeek = date.getDay();
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  return masks
    .filter((mask) => mask.dayOfWeek === dayOfWeek)
    .map((mask) => {
      const start = new Date(dayStart);
      start.setHours(
        Math.floor(mask.startMinutes / 60),
        mask.startMinutes % 60,
        0,
        0,
      );

      const endDayOffset = Math.floor(mask.endMinutes / 1440);
      const endTimeMinutes = mask.endMinutes % 1440;
      const end = new Date(dayStart);
      end.setDate(end.getDate() + endDayOffset);
      end.setHours(
        Math.floor(endTimeMinutes / 60),
        endTimeMinutes % 60,
        0,
        0,
      );

      return { start, end };
    });
}
