import { style } from "@vanilla-extract/css";
import { media, space } from "@/lib/theme";

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

// Category + color stay paired on mobile too — both controls are narrow
// pills, and the single-column stack wasted a full row on each.
export const doubleGrid = style({
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: "5px 22px",
  "@media": {
    [media.mobile]: { gap: "5px 12px" },
  },
});

// Splitting (task), Recurrence (plan), and DailyLimit (goal root) are
// mutually exclusive; AllowedTimes co-renders with them for tasks and goals.
// The slot spans the full field grid so each section can lay its control out
// on the left and its detail on the right, keeping a constant height whether
// the detail is showing or not; minHeight reserves that height for the empty
// case so the card never jumps.
export const splitRecurrenceSlot = style({
  gridColumn: "1 / -1",
  minWidth: 0,
  minHeight: 60,
  display: "flex",
  flexDirection: "column",
  gap: space["3"],
});
