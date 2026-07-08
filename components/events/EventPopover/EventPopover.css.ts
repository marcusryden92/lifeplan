import { style } from "@vanilla-extract/css";
import { vars, space } from "@/lib/theme";

export const metaIcon = style({
  color: vars.muted,
});

export const statusActionsRow = style({
  display: "flex",
  gap: space["1.5"],
});
