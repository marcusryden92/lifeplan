import { style } from "@vanilla-extract/css";
import { lumenDark } from "@/lib/theme";

const base = style({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 0,
});

const stripeLight = "rgba(22,20,42,0.055)";
const stripeDark = "rgba(255,255,255,0.05)";

export const pinstripe = style([
  base,
  {
    background: `repeating-linear-gradient(45deg, transparent 0, transparent 9px, ${stripeLight} 9px, ${stripeLight} 10px)`,
    selectors: {
      [`.${lumenDark} &`]: {
        background: `repeating-linear-gradient(45deg, transparent 0, transparent 9px, ${stripeDark} 9px, ${stripeDark} 10px)`,
      },
    },
  },
]);

const blobLight = {
  a: "rgba(99,102,241,0.22)",
  b: "rgba(59,130,246,0.18)",
};
const blobDark = {
  a: "rgba(129,140,248,0.26)",
  b: "rgba(96,165,250,0.22)",
};

export const blob = style([
  base,
  {
    overflow: "hidden",
    backgroundImage: [
      `radial-gradient(65% 55% at 12% 18%, ${blobLight.a} 0%, transparent 65%)`,
      `radial-gradient(70% 60% at 88% 82%, ${blobLight.b} 0%, transparent 65%)`,
    ].join(", "),
    selectors: {
      [`.${lumenDark} &`]: {
        backgroundImage: [
          `radial-gradient(65% 55% at 12% 18%, ${blobDark.a} 0%, transparent 65%)`,
          `radial-gradient(70% 60% at 88% 82%, ${blobDark.b} 0%, transparent 65%)`,
        ].join(", "),
      },
    },
  },
]);
