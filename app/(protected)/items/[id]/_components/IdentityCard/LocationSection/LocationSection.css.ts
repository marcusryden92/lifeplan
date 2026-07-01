import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

export const fieldStack = style({
  display: "flex",
  flexDirection: "column",
  gap: 7,
  minWidth: 0,
  gridColumn: "1 / -1",
});

export const fieldLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
  transition: themeTransition,
});

export const placeRow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
});

// Reserves a fixed line so the "from {category}" hint can toggle visibility
// without the surrounding column shifting up/down.
export const hintRow = style({
  display: "flex",
  alignItems: "center",
  minHeight: 17,
  marginTop: 2,
});

// Indented to align the first letter of "from ..." with the first letter of
// the "Inherited" / "Override" labels inside the SegmentedControl above.
// SegmentedControl is: 1px border + 3px outer padding + 14px button padding = 18px.
export const inheritedHint = style({
  paddingLeft: 18,
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 500,
  color: vars.muted,
  minWidth: 0,
  overflowWrap: "anywhere",
});

// Pulls ghost-size-sm buttons flush-left under the field grid by negating the
// button's internal left padding (pillBtn sm = padding: 6px 14px).
export const flushLeftBtn = style({
  marginLeft: -14,
});
