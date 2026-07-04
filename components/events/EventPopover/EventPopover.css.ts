import { style } from "@vanilla-extract/css";
import { vars, space, borderWidth } from "@/lib/theme";

export const metaIcon = style({
  color: vars.muted,
});

export const statusActionsRow = style({
  display: "flex",
  gap: space["1.5"],
});

export const footerSection = style({
  paddingTop: space["2"],
  borderTop: `${borderWidth.hairline}px solid ${vars.rule}`,
  display: "flex",
  flexDirection: "column",
  gap: space["0.5"],
});
