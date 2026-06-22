import { style } from "@vanilla-extract/css";
import { vars } from "@/lib/theme";

export const root = style({
  padding: "40px 0",
  textAlign: "center",
  color: vars.muted,
  fontFamily: vars.font.ui,
});

export const title = style({
  fontFamily: vars.font.display,
  fontSize: 18,
  color: vars.ink,
  margin: 0,
  marginBottom: 8,
});

export const body = style({
  fontSize: 13,
  lineHeight: 1.55,
  margin: 0,
});
