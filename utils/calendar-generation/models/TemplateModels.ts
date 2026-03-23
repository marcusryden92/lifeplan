export type TimeInterval = { startTime: string; endTime: string };
export type DayMask = TimeInterval[];
export type WeeklyMask = Record<number, DayMask>;

export type DateException = {
  dateISO: string;
  removed?: TimeInterval[];
  added?: TimeInterval[];
};

export type TemplateMask = {
  weeklyMask: WeeklyMask;
  exceptions?: DateException[];
};

export type TemplateTimeWithExceptions = {
  startTime: string;
  endTime: string;
  exceptions?: string[];
};

export type TemplateDayDef = {
  day: number;
  times: TemplateTimeWithExceptions[];
};

export type PerTemplateMask = {
  templateId: string;
  title?: string;
  color?: string;
  locationId?: string | null;
  occurrences: TemplateDayDef[];
  startDateISO?: string;
  intervalDays?: number;
};
