import { style } from "@vanilla-extract/css";
import { space, vars, themeTransition, text, fieldLabel } from "@/lib/theme";

export const boxesCol = style({
  display: "flex",
  flexDirection: "column",
  gap: space["1"],
  minWidth: 0,
});

export const inputsGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(70px, 1fr))",
  gap: space["2"],
});

export const inputStack = style({
  display: "flex",
  flexDirection: "column",
  maxWidth: 60,
  gap: space["1"],
});

export const inputCaption = style([
  fieldLabel,
  {
    whiteSpace: "nowrap",
    transition: themeTransition,
  },
]);

export const progressNote = style([
  text.bodySm,
  {
    color: vars.inkSoft,
    transition: themeTransition,
  },
]);
