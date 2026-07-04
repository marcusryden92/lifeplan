import { style, globalStyle } from "@vanilla-extract/css";
import {
  vars,
  themeTransition,
  interactiveTransition,
  colorMixAlpha,
  media,
  radii,
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
  gap: 12,
  padding: "20px 28px 18px",
  flexShrink: 0,
  "@media": {
    [media.mobile]: {
      padding: "16px 16px 12px",
      flexWrap: "wrap",
      gap: 10,
    },
  },
});

export const pageTitle = style({
  fontFamily: vars.font.display,
  fontSize: 32,
  fontWeight: 500,
  letterSpacing: "-0.03em",
  color: vars.ink,
  lineHeight: 1,
  margin: 0,
  transition: themeTransition,
  "@media": {
    [media.mobile]: { fontSize: 24 },
  },
});

export const titleSummary = style({
  fontSize: 12.5,
  color: vars.muted,
  fontWeight: 500,
  fontFamily: vars.font.ui,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const spacer = style({
  flex: 1,
});

export const actionCluster = style({
  display: "flex",
  gap: 8,
  flexShrink: 0,
});

export const mainGrid = style({
  display: "grid",
  gridTemplateColumns: "260px 1fr",
  gap: 16,
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
      padding: "0 16px 24px",
      gap: 14,
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
      [media.mobile]: { minHeight: "auto", borderRadius: radii.md },
    },
  },
]);

export const railHead = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
  padding: "0 8px 6px",
  transition: themeTransition,
});

export const railBody = style({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
});

export const railRow = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "5px 8px",
  borderRadius: radii.sm,
  cursor: "pointer",
  fontSize: 13.5,
  fontFamily: vars.font.ui,
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
});

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

export const railRowCount = style({
  fontSize: 10.5,
  fontVariantNumeric: "tabular-nums",
  color: vars.muted,
  fontWeight: 500,
  transition: themeTransition,
});

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

export const railRowAddChild = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  height: 18,
  borderRadius: 5,
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  opacity: 0,
  transition: interactiveTransition("opacity", "color", "background-color"),
  flexShrink: 0,
  padding: 0,
  selectors: {
    [`${railRow}:hover &`]: { opacity: 1 },
    "&:hover": { color: vars.ink, background: vars.interactive.hoverFill },
    "&:focus-visible": { opacity: 1, outline: `1px solid ${vars.accent.primary}` },
  },
});

export const treeChevron = style({
  display: "inline-flex",
  width: 14,
  height: 14,
  alignItems: "center",
  justifyContent: "center",
  color: vars.muted,
  cursor: "pointer",
  borderRadius: 3,
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
  marginTop: 8,
  paddingTop: 8,
  paddingLeft: 4,
  paddingRight: 4,
  borderTop: `1px solid ${vars.rule}`,
  transition: themeTransition,
});

export const railNewButton = style({
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "8px 10px",
  borderRadius: radii.sm,
  border: `1px dashed ${vars.rule}`,
  background: "transparent",
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  transition: themeTransition,
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
      [media.mobile]: { minHeight: 540, borderRadius: radii.md },
    },
  },
]);

export const emptyMain = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  padding: "60px 24px",
  fontFamily: vars.font.ui,
  fontSize: 14,
  color: vars.muted,
  textAlign: "center",
});

export const errorBanner = style({
  margin: "0 28px 14px",
  padding: "8px 12px",
  borderRadius: radii["sm+2"],
  background: `color-mix(in srgb, ${vars.status.error} ${colorMixAlpha.lightFill}%, transparent)`,
  border: `1px solid ${vars.status.error}`,
  color: vars.status.error,
  fontSize: 12.5,
  fontFamily: vars.font.ui,
  fontWeight: 500,
});
