import { style } from "@vanilla-extract/css";
import { vars, interactive2Transition, radii } from "@/lib/theme";

export const root = style({
  position: "relative",
  width: 32,
  height: 18,
  borderRadius: radii.pill,
  border: `1px solid ${vars.glass.stroke}`,
  background: vars.glass.bgSoft,
  cursor: "pointer",
  flexShrink: 0,
  padding: 0,
  transition: interactive2Transition("background", "border-color"),
  selectors: {
    '&[data-state="checked"]': {
      background: vars.ink,
      borderColor: vars.ink,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.accent.primary}`,
      outlineOffset: 2,
    },
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
});

export const thumb = style({
  display: "block",
  width: 14,
  height: 14,
  borderRadius: radii.pill,
  background: vars.paper,
  transform: "translateX(1px)",
  transition: interactive2Transition("transform"),
  willChange: "transform",
  selectors: {
    '&[data-state="checked"]': {
      transform: "translateX(15px)",
    },
  },
});
