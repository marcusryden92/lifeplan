import { style } from "@vanilla-extract/css";
import { vars, interactive2Transition } from "@/lib/theme";

export const root = style({
  position: "relative",
  width: 32,
  height: 18,
  borderRadius: 999,
  border: `1px solid ${vars.glass.stroke}`,
  background: vars.glass.bgSoft,
  cursor: "pointer",
  flexShrink: 0,
  padding: 0,
  transition: interactive2Transition("background", "border-color"),
  selectors: {
    '&[aria-checked="true"]': {
      background: vars.ink,
      borderColor: vars.ink,
    },
  },
});

export const thumb = style({
  position: "absolute",
  top: 1,
  left: 1,
  width: 14,
  height: 14,
  borderRadius: 999,
  background: vars.paper,
  transition: interactive2Transition("left"),
  selectors: {
    [`${root}[aria-checked="true"] &`]: {
      left: 15,
    },
  },
});
