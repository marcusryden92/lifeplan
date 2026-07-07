import { style } from "@vanilla-extract/css";
import { space, vars, themeTransition, radii } from "@/lib/theme";

export const card = style({
  padding: "12px 0",
  borderTop: `1px solid ${vars.rule}`,
  transition: themeTransition,
});

export const cardTitle = style({
  fontFamily: vars.font.display,
  fontSize: 16,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  marginBottom: space["3"],
  transition: themeTransition,
});

export const exceptionRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["3"],
  padding: "6px 0",
  fontFamily: vars.font.ui,
  fontSize: 13,
  color: vars.ink,
  transition: themeTransition,
});

export const exceptionTime = style({
  fontVariantNumeric: "tabular-nums",
  color: vars.inkSoft,
});

export const exceptionArrow = style({
  color: vars.muted,
});

export const exceptionSkipped = style({
  color: vars.muted,
  fontStyle: "italic",
});

export const restoreBtn = style({
  marginLeft: "auto",
  display: "inline-flex",
  alignItems: "center",
  gap: space["1"],
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: radii.pill,
  background: "transparent",
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 10px",
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.interactive.hoverFill,
      color: vars.ink,
    },
  },
});
