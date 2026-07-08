import { style } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  radii,
  text,
  caption,
  media,
  fieldLabel as fieldLabelPreset,
} from "@/lib/theme";

// Two field-grid columns: toggle on the left, chunk boxes on the right. The
// boxes sit beside the toggle rather than under it, so enabling splitting does
// not change the section's height. Column gap matches IdentityCard's fieldGrid.
export const splitGrid = style({
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

export const boxesCol = style({
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

export const toggleRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["3"],
  minHeight: 34,
});

// Clamp to two 15px lines so a wrapped hint can never grow the toggle row past
// its 34px min-height (which must match the Recurrence <select> so the two
// collapsed sections are the same height).
export const toggleHint = style([
  text.bodySm,
  {
    color: vars.muted,
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    overflow: "hidden",
    lineHeight: "15px",
    transition: themeTransition,
  },
]);

export const inputsGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(70px, 1fr))",
  gap: space["2"],
});

export const inputStack = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 70,
  gap: space["1"],
});

export const inputCaption = style([
  caption,
  {
    transition: themeTransition,
  },
]);

export const numberInput = style([
  text.row,
  {
    background: vars.glass.bgSoft,
    border: `1px solid ${vars.glass.stroke}`,
    borderRadius: radii["sm+2"],
    padding: "6px 10px",
    color: vars.ink,
    outline: "none",
    width: "100%",
    transition: themeTransition,
    selectors: {
      "&:focus": {
        borderColor: vars.accent.primary,
      },
    },
  },
]);

export const progressNote = style([
  text.bodySm,
  {
    color: vars.inkSoft,
    transition: themeTransition,
  },
]);
