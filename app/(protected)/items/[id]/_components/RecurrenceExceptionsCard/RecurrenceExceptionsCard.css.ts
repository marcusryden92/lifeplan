import { style } from "@vanilla-extract/css";
import { space, vars, themeTransition } from "@/lib/theme";

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

