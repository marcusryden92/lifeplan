import { style } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  radii,
  text,
  caption,
} from "@/lib/theme";

export const boxesCol = style({
  display: "flex",
  flexDirection: "column",
  gap: space["2"],
  minWidth: 0,
});

export const inputsGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(70px, 1fr))",
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
    borderRadius: radii.sm,
    padding: `${space["1"]}px ${space["2"]}px`,
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
