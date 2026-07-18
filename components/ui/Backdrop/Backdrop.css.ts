import { style } from "@vanilla-extract/css";
import { themeDark } from "@/lib/theme/themes.css";
import { DURATIONS } from "@/lib/theme/transitions";

const base = style({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 0,
});

// `background-image` with stacked gradients does not interpolate reliably
// across browsers, so the theme transitions snap. Instead, render both the
// light and dark variants and cross-fade their opacity — opacity transitions
// are smooth everywhere.

const stripeLight = "rgba(22,20,42,0.055)";
const stripeDark = "rgba(255,255,255,0.05)";

const fadeLayer = style({
  transition: `opacity ${DURATIONS.theme}s ease`,
});

export const pinstripeLight = style([
  base,
  fadeLayer,
  {
    opacity: 1,
    background: `repeating-linear-gradient(45deg, transparent 0, transparent 9px, ${stripeLight} 9px, ${stripeLight} 10px)`,
    selectors: {
      [`.${themeDark} &`]: { opacity: 0 },
    },
  },
]);

export const pinstripeDark = style([
  base,
  fadeLayer,
  {
    opacity: 0,
    background: `repeating-linear-gradient(45deg, transparent 0, transparent 9px, ${stripeDark} 9px, ${stripeDark} 10px)`,
    selectors: {
      [`.${themeDark} &`]: { opacity: 1 },
    },
  },
]);

// Single corner-to-corner linear gradient instead of two radial peaks.
// Two reasons:
//   - Cross-fading two stacked divs during a theme toggle briefly shows
//     the wrong-theme color. With concentrated radial peaks you get a
//     visible "black blob on white" flash mid-transition. A linear ramp
//     spreads the brightness uniformly, so any transient wrong-color is
//     smeared rather than punchy.
//   - Local gradient slope is bounded, which reduces the sub-panel
//     luminance step that drives backdrop-filter edge bleed (less
//     conclusive in practice — the bleed has multiple sources — but at
//     least it doesn't make it worse).
const blobLightColor = "rgba(255,255,255,0.55)";
const blobDarkColor = "rgba(60,64,72,0.45)";

const blobImage = (color: string) =>
  `linear-gradient(135deg, ${color} 0%, transparent 100%)`;

export const blobLight = style([
  base,
  fadeLayer,
  {
    overflow: "hidden",
    opacity: 1,
    backgroundImage: blobImage(blobLightColor),
    selectors: {
      [`.${themeDark} &`]: { opacity: 0 },
    },
  },
]);

export const blobDark = style([
  base,
  fadeLayer,
  {
    overflow: "hidden",
    opacity: 0,
    backgroundImage: blobImage(blobDarkColor),
    selectors: {
      [`.${themeDark} &`]: { opacity: 1 },
    },
  },
]);
