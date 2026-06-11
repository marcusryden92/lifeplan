import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

export const stubCard = style({
  padding: "32px 0",
  textAlign: "center",
});

export const stubTitle = style({
  fontFamily: vars.font.display,
  fontSize: 28,
  fontWeight: 500,
  letterSpacing: "-0.03em",
  color: vars.ink,
  marginBottom: 10,
  transition: themeTransition,
});

export const stubBody = style({
  fontSize: 13.5,
  lineHeight: 1.55,
  maxWidth: 440,
  margin: "0 auto",
  display: "inline-block",
});
