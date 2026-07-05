import { style, keyframes } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  popover,
  backdropFilters,
  colorMixAlpha,
  formInput,
  radii,
} from "@/lib/theme";

const FADE_MS = 160;
export const MODAL_FADE_MS = FADE_MS;

export const overlay = style({
  position: "fixed",
  inset: 0,
  background: vars.overlay,
  backdropFilter: backdropFilters.palette,
  WebkitBackdropFilter: backdropFilters.palette,
  zIndex: 150,
  opacity: 0,
  transition: `opacity ${FADE_MS}ms ease`,
  selectors: {
    "&[data-state='open']": {
      opacity: 1,
    },
  },
});

export const modal = style([
  popover({ size: "xl" }),
  {
    position: "fixed",
    zIndex: 151,
    top: "50%",
    left: "50%",
    width: "min(480px, calc(100vw - 32px))",
    maxHeight: "calc(100vh - 48px)",
    overflow: "visible",
    padding: "22px 24px",
    display: "flex",
    flexDirection: "column",
    gap: space["3.5"],
    fontFamily: vars.font.ui,
    color: vars.ink,
    transform: "translate(-50%, calc(-50% + 8px)) scale(0.985)",
    transition: `transform ${FADE_MS}ms ease, ${themeTransition}`,
    selectors: {
      "&[data-state='open']": {
        transform: "translate(-50%, -50%) scale(1)",
      },
    },
  },
]);

export const header = style({
  display: "flex",
  flexDirection: "column",
  gap: space["1"],
});

export const title = style({
  fontFamily: vars.font.display,
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  margin: 0,
});

export const subtitle = style({
  fontSize: 12,
  color: vars.muted,
});

export const fieldStack = style({
  display: "flex",
  flexDirection: "column",
  gap: space["1.5"],
});

export const fieldLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
});

export const searchWrap = style({
  position: "relative",
  zIndex: 100,
  isolation: "isolate",
});

export const searchIcon = style({
  position: "absolute",
  top: "50%",
  left: 10,
  transform: "translateY(-50%)",
  color: vars.muted,
  display: "inline-flex",
});

export const searchSpinner = style({
  position: "absolute",
  top: "50%",
  right: 10,
  transform: "translateY(-50%)",
  color: vars.muted,
  display: "inline-flex",
});

// Boxed input with extra left/right padding for the inline search icon +
// spinner overlay.
export const textInput = style([
  formInput({ variant: "boxed" }),
  {
    padding: "9px 36px 9px 32px",
  },
]);

export const plainInput = style([formInput({ variant: "boxed" })]);

export const selectedHint = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space["1"],
  fontSize: 11,
  color: vars.status.success,
  fontWeight: 600,
});

export const cascadeNote = style({
  display: "flex",
  alignItems: "flex-start",
  gap: space["1.5"],
  padding: "8px 10px",
  borderRadius: radii.sm,
  background: `color-mix(in srgb, ${vars.status.warning} ${colorMixAlpha.lightFill}%, transparent)`,
  border: `1px solid ${vars.status.warning}`,
  color: vars.status.warning,
  fontSize: 11.5,
  fontFamily: vars.font.ui,
});

// Reserved-height containers so conditional messages don't shift surrounding
// content when they appear. Heights match the visible-state intrinsic size
// (hint ~22 + gap 6 + cascade note ~52 with two lines of 11.5px text).
export const placeMessageSlot = style({
  minHeight: 80,
  display: "flex",
  flexDirection: "column",
  gap: space["1.5"],
});

export const errorSlot = style({
  minHeight: 36,
});

export const errorBlock = style({
  padding: "8px 12px",
  borderRadius: radii.sm,
  background: `color-mix(in srgb, ${vars.status.error} ${colorMixAlpha.lightFill}%, transparent)`,
  border: `1px solid ${vars.status.error}`,
  color: vars.status.error,
  fontSize: 12,
});

export const footer = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  justifyContent: "flex-end",
  marginTop: space["1"],
  position: "relative",
  zIndex: 0,
});

export const dangerSlot = style({ marginRight: "auto" });

const spinKeyframe = keyframes({
  to: { transform: "translateY(-50%) rotate(360deg)" },
});

export const spinning = style({
  animationName: spinKeyframe,
  animationDuration: "0.9s",
  animationTimingFunction: "linear",
  animationIterationCount: "infinite",
});
