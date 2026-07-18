import { style } from "@vanilla-extract/css";
import { vars } from "@/lib/theme/tokens.css";
import { space } from "@/lib/theme/scales";

export const metaIcon = style({
  color: vars.muted,
});

export const statusActionsRow = style({
  display: "flex",
  gap: space["1.5"],
});
