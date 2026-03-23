export type PerTemplateMask = {
  templateId: string;
  title?: string;
  color?: string;
  locationId?: string | null;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number; // may exceed 1440 for midnight-crossing templates
  startDateISO?: string;
  intervalDays?: number;
};
