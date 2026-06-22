import { style } from "@vanilla-extract/css";
import { themeDark, DURATIONS } from "@/lib/theme";

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

// Blob peaks pushed further from paper + higher alpha so the highlight is
// clearly visible in both modes.
const blobLightColor = "rgba(255,255,255,0.75)";
const blobDarkColor = "rgba(45,48,54,0.5)"; // peak ≈ #292c32 on #12141a

const blobImage = (color: string) =>
  [
    `radial-gradient(65% 55% at 12% 18%, ${color} 0%, transparent 65%)`,
    `radial-gradient(70% 60% at 88% 82%, ${color} 0%, transparent 65%)`,
  ].join(", ");

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
