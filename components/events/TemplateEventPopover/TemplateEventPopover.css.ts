import { style } from "@vanilla-extract/css";
import { vars, text, space } from "@/lib/theme";

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

// Ghost pill flush-left with the body content (negates the sm button's inline
// padding), mirroring the "Reset sub-goal places" restore control in the
// item-detail location section.
export const restoreBtn = style({
  marginLeft: `-${space["3"]}`,
  alignSelf: "flex-start",
});
