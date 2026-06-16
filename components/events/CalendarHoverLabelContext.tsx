"use client";

import { createContext, useContext } from "react";

export interface CalendarHoverLabel {
  name: string;
  color: string | null;
}

export const CalendarHoverLabelContext = createContext<
  ((label: CalendarHoverLabel | null) => void) | null
>(null);

/** Hook for any calendar-event component to push a label into the header.
 *  Returns `null` outside a provider — callers should no-op in that case. */
export function useSetCalendarHoverLabel() {
  return useContext(CalendarHoverLabelContext);
}
