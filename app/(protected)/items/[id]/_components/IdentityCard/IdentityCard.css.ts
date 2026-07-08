import { style } from "@vanilla-extract/css";
import { media } from "@/lib/theme";

export const card = style({
  display: "flex",
  flexDirection: "column",
});

export const cardBody = style({
  padding: "12px 0",
});

export const fieldGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "13px 22px",
  "@media": {
    [media.mobile]: { gridTemplateColumns: "1fr" },
  },
});

export const doubleGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "13px 22px",
  "@media": {
    [media.mobile]: { gridTemplateColumns: "1fr" },
  },
});

// Splitting (task) and Recurrence (plan) are mutually exclusive and neither
// renders for a goal. The slot spans the full field grid so each section can
// lay its control out on the left and its detail (chunk boxes / until date) on
// the right, keeping a constant height whether the detail is showing or not;
// minHeight reserves that height for the empty goal case so the card never jumps.
export const splitRecurrenceSlot = style({
  gridColumn: "1 / -1",
  minWidth: 0,
  minHeight: 56,
});
