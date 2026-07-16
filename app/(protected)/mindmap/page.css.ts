import { style } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  media,
  radii,
  display,
  text,
  caption,
  fieldLabel,
  zIndex,
} from "@/lib/theme";

export const page = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
  "@media": {
    [media.mobile]: {
      flex: "0 0 auto",
      minHeight: "auto",
    },
    // A landscape phone is short, not narrow — the portrait block-and-scroll
    // treatment would make the canvas taller than the viewport, so keep the
    // desktop fill layout.
    [media.landscapePhone]: {
      flex: 1,
      minHeight: 0,
    },
  },
});

export const subHeader = style({
  display: "flex",
  alignItems: "baseline",
  gap: space["3"],
  padding: "20px 28px 12px",
  flexShrink: 0,
  flexWrap: "wrap",
  "@media": {
    [media.mobile]: {
      padding: "16px 16px 10px",
      gap: space["2.5"],
    },
  },
});

export const pageTitle = style([
  display.pageTitle,
  {
    color: vars.ink,
    lineHeight: 1,
    margin: 0,
    transition: themeTransition,
    "@media": {
      [media.mobile]: { fontSize: 24 },
    },
  },
]);

export const titleSummary = style([
  text.bodySm,
  {
    color: vars.muted,
    fontVariantNumeric: "tabular-nums",
    transition: themeTransition,
  },
]);

export const headerControls = style({
  display: "flex",
  alignItems: "center",
  gap: space["4"],
  marginLeft: "auto",
  flexWrap: "wrap",
  "@media": {
    [media.mobile]: {
      marginLeft: 0,
      width: "100%",
      gap: space["3"],
    },
  },
});

export const controlGroup = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
});

export const controlLabel = style([
  fieldLabel,
  {
    transition: themeTransition,
  },
]);

const SLIDER_TRACK_HEIGHT = 6;
const SLIDER_THUMB = 13;

export const zoomTrack = style({
  position: "relative",
  width: 280,
  height: SLIDER_THUMB,
  "@media": {
    [media.tablet]: { width: 200 },
    [media.mobile]: { width: 150 },
  },
});

export const zoomTrackBar = style({
  position: "absolute",
  left: 0,
  right: 0,
  top: "50%",
  transform: "translateY(-50%)",
  height: SLIDER_TRACK_HEIGHT,
  borderRadius: radii.pill,
  background: "transparent",
  border: `1px solid ${vars.glass.stroke}`,
  pointerEvents: "none",
  transition: themeTransition,
});

export const zoomFill = style({
  position: "absolute",
  left: 0,
  top: "50%",
  transform: "translateY(-50%)",
  height: SLIDER_TRACK_HEIGHT,
  borderRadius: radii.pill,
  background: vars.inkSoft,
  pointerEvents: "none",
  transition: themeTransition,
});

export const zoomSlider = style({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  margin: 0,
  WebkitAppearance: "none",
  appearance: "none",
  background: "transparent",
  outline: "none",
  cursor: "pointer",
  selectors: {
    "&::-webkit-slider-thumb": {
      WebkitAppearance: "none",
      appearance: "none",
      width: SLIDER_THUMB,
      height: SLIDER_THUMB,
      borderRadius: radii.pill,
      background: vars.ink,
      border: "none",
      cursor: "pointer",
    },
    "&::-moz-range-thumb": {
      width: SLIDER_THUMB,
      height: SLIDER_THUMB,
      border: "none",
      borderRadius: radii.pill,
      background: vars.ink,
      cursor: "pointer",
    },
    "&::-moz-range-track": {
      background: "transparent",
    },
  },
});

export const legendRow = style([
  caption,
  {
    display: "flex",
    alignItems: "center",
    gap: space["5"],
    flexWrap: "wrap",
    padding: "0 28px 12px",
    color: vars.muted,
    transition: themeTransition,
    "@media": {
      [media.mobile]: {
        padding: "0 16px 10px",
        gap: space["3.5"],
      },
    },
  },
]);

export const legendKeys = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space["6"],
  marginLeft: "auto",
});

export const canvasCard = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
  flex: 1,
  margin: "0 28px 28px",
  border: `1px solid ${vars.rule}`,
  borderRadius: radii["md+2"],
  transition: themeTransition,
  "@media": {
    [media.mobile]: {
      margin: "0 0 24px",
      minHeight: 480,
      borderRadius: 0,
      borderLeftWidth: 0,
      borderRightWidth: 0,
    },
    [media.landscapePhone]: {
      margin: 0,
      minHeight: 0,
    },
  },
});

export const emptyMain = style([
  text.bodyLg,
  {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: "60px 24px",
    color: vars.muted,
    textAlign: "center",
  },
]);

// Mobile-only: opens the layout settings in a BottomSheet instead of the
// floating panel, which would swallow the map on a phone.
export const mobileSettingsButton = style({
  position: "absolute",
  top: space["3"],
  right: space["3"],
  zIndex: zIndex.floating,
  display: "inline-flex",
  alignItems: "center",
  gap: space["1.5"],
  minHeight: 36,
  padding: `0 ${space["3"]}px`,
  background: vars.glass.bgDeep,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: radii.pill,
  color: vars.ink,
  fontFamily: vars.font.ui,
  fontSize: 12,
  fontWeight: 600,
  boxShadow: vars.shadow.panelSm,
  cursor: "pointer",
  transition: themeTransition,
});
