import { style } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  radii,
  text,
  caption,
  fieldLabel as fieldLabelPreset,
} from "@/lib/theme";

export const fieldStack = style({
  display: "flex",
  flexDirection: "column",
  gap: space["2"],
  minWidth: 0,
});

export const fieldLabel = style([
  fieldLabelPreset,
  {
    transition: themeTransition,
  },
]);

export const toggleRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["3"],
  minHeight: 34,
});

export const toggleHint = style([
  text.bodySm,
  {
    color: vars.muted,
    transition: themeTransition,
  },
]);

export const inputsGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: space["2"],
});

export const inputStack = style({
  display: "flex",
  flexDirection: "column",
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
