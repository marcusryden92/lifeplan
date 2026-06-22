import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

export const fieldStack = style({
  display: "flex",
  flexDirection: "column",
  gap: 7,
  minWidth: 0,
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
  gap: 8,
  flexWrap: "wrap",
});

export const overrideToggle = style({
  border: `1px solid ${vars.glass.stroke}`,
  background: "transparent",
  borderRadius: 999,
  padding: "3px 10px",
  fontSize: 10,
  fontFamily: vars.font.ui,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: vars.muted,
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&:hover": { color: vars.ink, borderColor: vars.rule },
    "&[aria-pressed='true']": {
      background: vars.ink,
      borderColor: vars.ink,
      color: vars.paper,
    },
  },
});

export const inheritedHint = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 500,
  color: vars.muted,
  // Allows the hint to wrap inside the place cell when the category name is
  // long, instead of overflowing into the column on the right.
  minWidth: 0,
  overflowWrap: "anywhere",
});

// Pulls ghost-size-sm buttons flush-left under the field grid by negating the
// button's internal left padding (pillBtn sm = padding: 6px 14px).
export const flushLeftBtn = style({
  marginLeft: -14,
});
