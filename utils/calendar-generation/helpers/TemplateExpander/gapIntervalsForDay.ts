import { PerTemplateMask } from "../../models/TemplateModels";
import { dateTimeService } from "../../utils/dateTimeService";
import { masksToIntervalsForDay } from "./masksToIntervalsForDay";

export function gapIntervalsForDay(
  masks: PerTemplateMask[],
  date: Date,
): Array<{ start: Date; end: Date }> {
  const dayStart = dateTimeService.startOfDay(date);
  const dayEnd = dateTimeService.endOfDay(date);

  const occupied = masksToIntervalsForDay(masks, dayStart);

  if (occupied.length === 0) {
    return [{ start: dayStart, end: dayEnd }];
  }

  occupied.sort((a, b) => a.start.getTime() - b.start.getTime());

  const gaps: Array<{ start: Date; end: Date }> = [];

  if (occupied[0].start.getTime() > dayStart.getTime()) {
    gaps.push({ start: dayStart, end: occupied[0].start });
  }
  for (let i = 0; i < occupied.length - 1; i++) {
    if (occupied[i].end.getTime() < occupied[i + 1].start.getTime()) {
      gaps.push({ start: occupied[i].end, end: occupied[i + 1].start });
    }
  }
  const last = occupied[occupied.length - 1];
  if (last.end.getTime() < dayEnd.getTime()) {
    gaps.push({ start: last.end, end: dayEnd });
  }

  return gaps;
}
