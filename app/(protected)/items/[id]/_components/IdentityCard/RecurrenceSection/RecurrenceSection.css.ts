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

export const select = style({
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: radii["sm+2"],
  padding: "8px 12px",
  fontFamily: vars.font.ui,
  fontSize: 13.5,
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
});

export const untilRow = style({
  display: "flex",
  flexDirection: "column",
  gap: space["1"],
});
