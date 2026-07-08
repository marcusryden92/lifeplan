import { style } from "@vanilla-extract/css";

const motionOk = "(prefers-reduced-motion: no-preference)";

// The hidden state lives entirely inside the motion query so reduced-motion
// users (and environments without IntersectionObserver) see content as-is.
export const reveal = style({
  "@media": {
    [motionOk]: {
      opacity: 0,
      transform: "translateY(22px)",
      transition:
        "opacity 700ms ease, transform 900ms cubic-bezier(0.22, 1, 0.36, 1)",
    },
  },
});

export const revealVisible = style({
  "@media": {
    [motionOk]: {
      opacity: 1,
      transform: "none",
    },
  },
});
