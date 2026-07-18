import { globalStyle, keyframes, style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/lib/theme/tokens.css";
import { radii, space } from "@/lib/theme/scales";

// Lives on the dark editorial section only, hence the literal paper-tinted
// rgba values instead of theme vars.
const LOOP = "9s";
const motionOk = "(prefers-reduced-motion: no-preference)";

export const card = style({
  width: "100%",
  maxWidth: 460,
  marginTop: "clamp(40px, 4vw, 56px)",
  padding: "16px 18px 20px",
  borderRadius: radii["xl+2"],
  border: "1px solid rgba(242,239,234,0.14)",
  background: "rgba(242,239,234,0.05)",
});

export const header = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space["3"],
  marginBottom: space["3.5"],
});

export const day = style({
  fontFamily: vars.font.display,
  fontSize: 15,
  fontWeight: 500,
  letterSpacing: "-0.01em",
  color: "rgba(242,239,234,0.85)",
});

const chipIn = keyframes({
  "0%, 25%": { opacity: 0, transform: "translateY(-4px)" },
  "30%, 91%": { opacity: 1, transform: "none" },
  "94%, 100%": { opacity: 0, transform: "translateY(-4px)" },
});

export const chip = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: radii.pill,
  background: `color-mix(in srgb, ${vars.swatches.rose} 26%, transparent)`,
  border: `1px solid color-mix(in srgb, ${vars.swatches.rose} 55%, transparent)`,
  color: "rgba(242,239,234,0.9)",
  "@media": {
    [motionOk]: {
      animation: `${chipIn} ${LOOP} ease infinite`,
    },
  },
});

const canvasFade = keyframes({
  "0%, 88%": { opacity: 1 },
  "93%, 96%": { opacity: 0 },
  "100%": { opacity: 1 },
});

// 40px per hour, 9:00 at the top.
export const canvas = style({
  position: "relative",
  height: 244,
  backgroundImage:
    "repeating-linear-gradient(to bottom, rgba(242,239,234,0.09) 0 1px, transparent 1px 40px)",
  "@media": {
    [motionOk]: {
      animation: `${canvasFade} ${LOOP} ease infinite`,
    },
  },
});

export const hour = style({
  position: "absolute",
  left: 0,
  transform: "translateY(-50%)",
  fontFamily: vars.font.ui,
  fontSize: 10,
  color: "rgba(242,239,234,0.45)",
});

const blockBase = style({
  position: "absolute",
  left: 48,
  right: 8,
  padding: "5px 9px",
  borderRadius: radii.xs,
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  fontWeight: 600,
  color: "rgba(242,239,234,0.92)",
  boxSizing: "border-box",
  overflow: "hidden",
});

const blockTone = styleVariants(
  {
    blue: vars.swatches.blue,
    violet: vars.swatches.violet,
    green: vars.swatches.green,
    rose: vars.swatches.rose,
  },
  (c) => ({
    background: `color-mix(in srgb, ${c} 30%, transparent)`,
    borderLeft: `3px solid ${c}`,
  }),
);

export const blockDeep = style([
  blockBase,
  blockTone.blue,
  { top: 0, height: 76 },
]);

const meetingIn = keyframes({
  "0%, 26%": { opacity: 0, transform: "translateY(-8px)" },
  "33%, 93%": { opacity: 1, transform: "none" },
  "95%, 100%": { opacity: 0, transform: "translateY(-8px)" },
});

export const blockMeeting = style([
  blockBase,
  blockTone.rose,
  {
    top: 80,
    height: 36,
    "@media": {
      [motionOk]: {
        animation: `${meetingIn} ${LOOP} ease infinite`,
      },
    },
  },
]);

const writingShift = keyframes({
  "0%, 30%": { transform: "none" },
  "38%, 93%": { transform: "translateY(40px)" },
  "96%, 100%": { transform: "none" },
});

// Base transform is the post-reflow position so reduced-motion users see
// the day as the engine leaves it; the loop resets while the canvas is
// faded out.
export const blockWriting = style([
  blockBase,
  blockTone.violet,
  {
    top: 80,
    height: 56,
    transform: "translateY(40px)",
    "@media": {
      [motionOk]: {
        animation: `${writingShift} ${LOOP} cubic-bezier(0.22, 1, 0.36, 1) infinite`,
      },
    },
  },
]);

export const blockGym = style([
  blockBase,
  blockTone.green,
  { top: 200, height: 36 },
]);

globalStyle(`${card} *`, {
  pointerEvents: "none",
});
