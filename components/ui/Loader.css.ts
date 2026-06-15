import { style, keyframes } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars, themeTransition } from "@/lib/theme";

const slide = keyframes({
  "0%": { transform: "translateX(-100%)" },
  "100%": { transform: "translateX(250%)" },
});

export const loaderTrack = recipe({
  base: {
    position: "relative",
    background: vars.rule,
    borderRadius: 999,
    overflow: "hidden",
    transition: themeTransition,
    opacity: "80%",
  },
  variants: {
    size: {
      sm: { width: 80, height: 5 },
      md: { width: 120, height: 10 },
      lg: { width: 160, height: 15 },
    },
  },
  defaultVariants: { size: "md" },
});

export const loaderPill = style({
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  width: "40%",
  borderRadius: 999,
  animationName: slide,
  animationDuration: "1.2s",
  animationIterationCount: "infinite",
  animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  willChange: "transform",
});
