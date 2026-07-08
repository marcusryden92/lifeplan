import { style } from "@vanilla-extract/css";
import { vars, text } from "@/lib/theme";

// Composed with the shared `header` class while the popover is being dragged.
export const headerGrabbing = style({
  cursor: "grabbing",
});

export const metaIcon = style({
  color: vars.muted,
});

export const note = style([
  text.label,
  {
    color: vars.muted,
    lineHeight: 1.45,
  },
]);
