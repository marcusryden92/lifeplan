import { style } from "@vanilla-extract/css";
import { space, vars, themeTransition, radii } from "@/lib/theme";

export const fieldStack = style({
  display: "flex",
  flexDirection: "column",
  gap: space["2"],
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

export const toggleRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["3"],
  minHeight: 34,
});

export const toggleHint = style({
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  color: vars.muted,
  transition: themeTransition,
});

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

export const inputCaption = style({
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  color: vars.muted,
  transition: themeTransition,
});

export const numberInput = style({
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: radii["sm+2"],
  padding: "8px 10px",
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  color: vars.ink,
  outline: "none",
  width: "100%",
  transition: themeTransition,
  selectors: {
    "&:focus": {
      borderColor: vars.accent.primary,
    },
  },
});

export const progressNote = style({
  fontFamily: vars.font.ui,
  fontSize: 12,
  color: vars.inkSoft,
  transition: themeTransition,
});
