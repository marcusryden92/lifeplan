import { style, globalStyle } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  interactiveTransition,
  colorMixAlpha,
  media,
  radii,
  iconBtn,
  display,
  text,
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
  padding: "20px 28px 18px",
  flexShrink: 0,
  "@media": {
    [media.mobile]: {
      padding: "16px 16px 12px",
      flexWrap: "wrap",
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

export const spacer = style({
  flex: 1,
});

export const actionCluster = style({
  display: "flex",
  gap: space["2"],
  flexShrink: 0,
});

export const mainGrid = style({
  display: "grid",
  gridTemplateColumns: "260px 1fr",
  gap: space["4"],
  padding: "0 28px 28px",
  flex: 1,
  minHeight: 0,
  "@media": {
    [media.tablet]: {
      gridTemplateColumns: "1fr",
      flex: "0 0 auto",
      minHeight: "auto",
    },
    [media.mobile]: {
      padding: "0 0 24px",
      gap: space["3.5"],
    },
  },
});

const cardBase = style({
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
});

export const rail = style([
  cardBase,
  {
    border: `1px solid ${vars.rule}`,
    borderRadius: radii["md+2"],
    padding: "12px 8px 8px",
    background: "transparent",
    transition: themeTransition,
    "@media": {
      [media.mobile]: {
        minHeight: "auto",
        borderRadius: 0,
        borderLeftWidth: 0,
        borderRightWidth: 0,
      },
    },
  },
]);

export const railHead = style([
  fieldLabel,
  {
    padding: "0 8px 6px",
    transition: themeTransition,
  },
]);

export const railBody = style({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
});

export const railRow = style([
  text.row,
  {
    display: "flex",
    alignItems: "center",
    gap: space["2"],
    padding: "5px 8px",
    borderRadius: radii.sm,
    cursor: "pointer",
    color: vars.ink,
    background: "transparent",
    border: "1px solid transparent",
    transition: themeTransition,
    textAlign: "left",
    width: "100%",
    selectors: {
      "&:hover": {
        background: vars.interactive.hoverFill,
      },
    },
  },
]);

export const railRowActive = style({
  background: vars.glass.bgDeep,
  borderColor: vars.glass.stroke,
  fontWeight: 600,
});

export const railRowDot = style({
  display: "inline-block",
  width: 9,
  height: 9,
  borderRadius: radii.pill,
  flexShrink: 0,
});

export const railRowNoDot = style({
  display: "inline-block",
  width: 9,
  height: 9,
  borderRadius: radii.pill,
  border: `1px dashed ${vars.muted}`,
  opacity: 0.5,
  flexShrink: 0,
});

export const railRowLabel = style({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
});

export const railRowCount = style([
  text.microLabel,
  {
    fontVariantNumeric: "tabular-nums",
    color: vars.muted,
    transition: themeTransition,
  },
]);

// Drop-target visualization on the tree rows. "before"/"after" draw a 2px
// accent line at the top/bottom of the row; "into" highlights the row body to
// signal it'll become the drop target's parent.
globalStyle(`${railRow}[data-dragging="true"]`, {
  opacity: 0.4,
});

globalStyle(`${railRow}[data-drag-over="before"]`, {
  boxShadow: `inset 0 2px 0 0 ${vars.accent.primary}`,
});

globalStyle(`${railRow}[data-drag-over="after"]`, {
  boxShadow: `inset 0 -2px 0 0 ${vars.accent.primary}`,
});

globalStyle(`${railRow}[data-drag-over="into"]`, {
  background: vars.glass.bgDeep,
  borderColor: vars.accent.primary,
});

export const railRowAddChild = style([
  iconBtn({ size: "sm" }),
  {
    color: vars.muted,
    opacity: 0,
    transition: interactiveTransition("opacity", "color", "background-color"),
    selectors: {
      [`${railRow}:hover &`]: { opacity: 1 },
      "&:focus-visible": {
        opacity: 1,
        outline: `1px solid ${vars.accent.primary}`,
      },
    },
  },
]);

export const treeChevron = style({
  display: "inline-flex",
  width: 14,
  height: 14,
  alignItems: "center",
  justifyContent: "center",
  color: vars.muted,
  cursor: "pointer",
  borderRadius: radii.xs,
  transition: themeTransition,
  selectors: {
    "&:hover": {
      color: vars.ink,
    },
  },
});

export const treeChevronSpacer = style({
  display: "inline-block",
  width: 14,
});

export const railFooter = style({
  flexShrink: 0,
  marginTop: space["2"],
  paddingTop: space["2"],
  paddingLeft: space["1"],
  paddingRight: space["1"],
  borderTop: `1px solid ${vars.rule}`,
  transition: themeTransition,
});

export const railNewButton = style({
  width: "100%",
  justifyContent: "center",
  gap: space["1.5"],
  padding: "8px 10px",
  borderRadius: radii.sm,
  border: `1px dashed ${vars.rule}`,
  color: vars.muted,
  selectors: {
    "&:hover": {
      color: vars.ink,
      borderColor: vars.glass.stroke,
      background: vars.interactive.hoverFill,
    },
  },
});

export const mainCard = style([
  cardBase,
  {
    border: `1px solid ${vars.rule}`,
    borderRadius: radii["md+2"],
    transition: themeTransition,
    "@media": {
      [media.mobile]: {
        minHeight: 540,
        borderRadius: 0,
        borderLeftWidth: 0,
        borderRightWidth: 0,
      },
    },
  },
]);

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
