import { style } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  colorMixAlpha,
  media,
  radii,
  display,
  text,
  caption,
  fieldLabel,
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

export const zoomSlider = style({
  width: 300,
  accentColor: vars.muted,
  cursor: "pointer",
  "@media": {
    [media.tablet]: {
      width: 200,
    },
    [media.mobile]: {
      width: 150,
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

export const legendItem = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space["1.5"],
});

export const legendKeys = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space["4"],
  marginLeft: "auto",
});

export const kbdHint = style([
  text.microLabel,
  {
    display: "inline-flex",
    alignItems: "center",
    gap: space["1.5"],
    color: vars.muted,
    transition: themeTransition,
  },
]);

export const errorBanner = style([
  text.bodySm,
  {
    margin: "0 28px 14px",
    padding: "8px 12px",
    borderRadius: radii["sm+2"],
    background: `color-mix(in srgb, ${vars.status.error} ${colorMixAlpha.lightFill}%, transparent)`,
    border: `1px solid ${vars.status.error}`,
    color: vars.status.error,
  },
]);

export const canvasCard = style({
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
