import { style } from "@vanilla-extract/css";
import { space, vars, themeTransition, text, caption } from "@/lib/theme";

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

export const progressNote = style([
  text.bodySm,
  {
    color: vars.inkSoft,
    transition: themeTransition,
  },
]);
