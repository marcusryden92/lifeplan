import { style } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  radii,
  text,
  media,
  fieldLabel as fieldLabelPreset,
} from "@/lib/theme";

// Mirror SplittingSection: the recurrence select on the left, the optional
// "until" date on the right, so setting an end date does not grow the section.
export const recurGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "13px 22px",
  alignItems: "start",
  minWidth: 0,
  "@media": {
    [media.mobile]: { gridTemplateColumns: "1fr" },
  },
});

export const fieldStack = style({
  display: "flex",
  flexDirection: "column",
  gap: space["2"],
  minWidth: 0,
});

export const fieldLabel = style([
  fieldLabelPreset,
  {
    whiteSpace: "nowrap",
    transition: themeTransition,
  },
]);

export const select = style([
  text.row,
  {
    background: vars.glass.bgSoft,
    border: `1px solid ${vars.glass.stroke}`,
    borderRadius: radii["sm+2"],
    padding: "6px 11px",
    minHeight: 34,
    color: vars.ink,
    outline: "none",
    width: "100%",
    appearance: "none",
    cursor: "pointer",
    transition: themeTransition,
    selectors: {
      "&:focus": {
        borderColor: vars.accent.primary,
      },
    },
  },
]);
