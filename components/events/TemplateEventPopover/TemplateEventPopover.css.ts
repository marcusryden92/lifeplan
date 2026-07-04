import { style } from "@vanilla-extract/css";
import { vars, space, borderWidth } from "@/lib/theme";

// Composed with the shared `header` class while the popover is being dragged.
export const headerGrabbing = style({
  cursor: "grabbing",
});

export const metaIcon = style({
  color: vars.muted,
});

export const note = style({
  fontSize: 11.5,
  color: vars.muted,
  fontFamily: vars.font.ui,
  lineHeight: 1.45,
});

export const actionsSection = style({
  paddingTop: space["2"],
  borderTop: `${borderWidth.hairline}px solid ${vars.rule}`,
  display: "flex",
  flexDirection: "column",
  gap: space["0.5"],
});
