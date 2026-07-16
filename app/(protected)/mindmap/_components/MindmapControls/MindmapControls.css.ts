import { style } from "@vanilla-extract/css";
import {
  vars,
  space,
  radii,
  text,
  caption,
  fieldLabel,
  themeTransition,
  media,
  zIndex,
} from "@/lib/theme";

export const panel = style({
  position: "absolute",
  top: space["4"],
  left: space["4"],
  width: 244,
  maxWidth: "calc(100% - 32px)",
  padding: space["3.5"],
  background: vars.glass.bgDeep,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: radii["lg+2"],
  boxShadow: vars.shadow.panel,
  zIndex: zIndex.floating,
  transition: themeTransition,
  "@media": {
    [media.mobile]: {
      top: space["3"],
      left: space["3"],
      width: 208,
    },
  },
});

export const header = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const title = style([
  caption,
  {
    color: vars.ink,
    fontWeight: 650,
    letterSpacing: "0.02em",
    transition: themeTransition,
  },
]);

export const collapse = style({
  appearance: "none",
  WebkitAppearance: "none",
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  width: 22,
  height: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  lineHeight: 1,
  borderRadius: radii.sm,
  transition: themeTransition,
  selectors: {
    "&:hover": {
      color: vars.ink,
      background: vars.interactive.hoverFill,
    },
  },
});

export const body = style({
  display: "flex",
  flexDirection: "column",
  gap: space["3"],
  marginTop: space["3"],
});

export const field = style({
  display: "flex",
  flexDirection: "column",
  gap: space["1.5"],
  selectors: {
    "&[data-disabled]": {
      opacity: 0.4,
      pointerEvents: "none",
    },
  },
});

export const fieldRow = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
});

export const label = style([
  fieldLabel,
  {
    transition: themeTransition,
  },
]);

export const value = style([
  text.microLabel,
  {
    color: vars.accent.primary,
    fontVariantNumeric: "tabular-nums",
    transition: themeTransition,
  },
]);

const THUMB = 14;

export const slider = style({
  WebkitAppearance: "none",
  appearance: "none",
  width: "100%",
  height: 4,
  margin: 0,
  borderRadius: radii.pill,
  background: vars.glass.stroke,
  outline: "none",
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&::-webkit-slider-thumb": {
      WebkitAppearance: "none",
      appearance: "none",
      width: THUMB,
      height: THUMB,
      borderRadius: radii.pill,
      background: vars.ink,
      border: `3px solid ${vars.accent.primary}`,
      cursor: "pointer",
    },
    "&::-moz-range-thumb": {
      width: THUMB,
      height: THUMB,
      borderRadius: radii.pill,
      background: vars.ink,
      border: `3px solid ${vars.accent.primary}`,
      cursor: "pointer",
    },
    "&::-moz-range-track": {
      background: "transparent",
    },
    "&:focus-visible": {
      boxShadow: `0 0 0 3px ${vars.accent.primary}44`,
    },
  },
});
