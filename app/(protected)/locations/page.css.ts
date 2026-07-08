import { style, globalStyle } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  colorMixAlpha,
  media,
  radii,
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
    [media.mobile]: { flex: "0 0 auto", minHeight: "auto" },
  },
});

export const subHeader = style({
  display: "flex",
  alignItems: "center",
  gap: space["3"],
  padding: "20px 28px 18px",
  flexShrink: 0,
  flexWrap: "wrap",
  "@media": {
    [media.mobile]: { padding: "16px 16px 12px", gap: space["2.5"] },
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

export const spacer = style({ flex: 1 });

export const headActions = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  flexShrink: 0,
  flexWrap: "wrap",
  // marginLeft: auto keeps the cluster right-aligned even when the parent
  // subHeader wraps it onto its own row â€” without it, a wrapped row reverts
  // to the left edge and the title sits visually orphaned.
  marginLeft: "auto",
});

// Inline status pill that sits in the subHeader between titleSummary and the
// action cluster. Translucent tinted background; the surrounding flex layout
// keeps the action cluster right-aligned whether the banner is present or not.
export const banner = style([
  text.label,
  {
    padding: "5px 12px",
    borderRadius: radii.pill,
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: themeTransition,
  },
]);

export const successBanner = style([
  banner,
  {
    background: `color-mix(in srgb, ${vars.status.success} ${colorMixAlpha.lightFill}%, transparent)`,
    border: `1px solid ${vars.status.success}`,
    color: vars.status.success,
  },
]);

export const errorBanner = style([
  banner,
  {
    background: `color-mix(in srgb, ${vars.status.error} ${colorMixAlpha.lightFill}%, transparent)`,
    border: `1px solid ${vars.status.error}`,
    color: vars.status.error,
  },
]);

export const mainGrid = style({
  display: "grid",
  gridTemplateColumns: "300px 1fr",
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
      padding: "0 16px 24px",
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
      [media.mobile]: { minHeight: "auto", borderRadius: radii.md },
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
  gap: space["1"],
});

export const railRow = style([
  text.row,
  {
    display: "flex",
    alignItems: "flex-start",
    gap: space["2"],
    padding: "8px 8px",
    borderRadius: radii.sm,
    cursor: "pointer",
    color: vars.ink,
    background: "transparent",
    border: "1px solid transparent",
    transition: themeTransition,
    textAlign: "left",
    width: "100%",
    selectors: {
      "&:hover": { background: vars.interactive.hoverFill },
    },
  },
]);

export const railRowPin = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 16,
  height: 16,
  color: vars.muted,
  flexShrink: 0,
  marginTop: space["0.5"],
});

export const railRowMeta = style({
  display: "flex",
  flexDirection: "column",
  gap: space["0.5"],
  flex: 1,
  minWidth: 0,
});

export const railRowName = style({
  fontWeight: 600,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const railRowAddress = style([
  text.microLabel,
  {
    color: vars.muted,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontVariantNumeric: "tabular-nums",
  },
]);

export const railRowTags = style({
  marginTop: space["1"],
  display: "flex",
  flexWrap: "wrap",
  gap: space["1"],
});

export const railRowTag = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space["1"],
  padding: "2px 6px",
  borderRadius: 4,
  fontSize: 9.5,
  fontFamily: vars.font.ui,
  fontWeight: 600,
  letterSpacing: "0.04em",
  color: vars.muted,
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  transition: themeTransition,
});

export const railRowTagDot = style({
  width: 6,
  height: 6,
  borderRadius: radii.pill,
  flexShrink: 0,
});

export const railFooter = style({
  flexShrink: 0,
  marginTop: space["2"],
  paddingTop: space["2"],
  paddingLeft: space["1"],
  paddingRight: space["1"],
  borderTop: `1px solid ${vars.rule}`,
  display: "flex",
  flexDirection: "column",
  gap: space["2"],
  transition: themeTransition,
});

export const railNote = style([
  text.microLabel,
  {
    color: vars.muted,
    textAlign: "center",
    padding: "0 6px",
    transition: themeTransition,
  },
]);

export const railNewButton = style({
  width: "100%",
  justifyContent: "center",
  gap: space["1.5"],
  padding: "8px 10px",
  borderRadius: radii.sm,
  border: `1px dashed ${vars.rule}`,
  color: vars.muted,
  selectors: {
    "&:hover:not(:disabled)": {
      color: vars.ink,
      borderColor: vars.glass.stroke,
      background: vars.interactive.hoverFill,
    },
  },
});

export const matrixPane = style([
  cardBase,
  {
    border: `1px solid ${vars.rule}`,
    borderRadius: radii["md+2"],
    padding: "16px 18px",
    gap: space["3"],
    overflow: "auto",
    transition: themeTransition,
    "@media": {
      [media.mobile]: { minHeight: 540, borderRadius: radii.md },
    },
  },
]);

export const matrixHead = style({
  display: "flex",
  alignItems: "baseline",
  gap: space["3"],
  flexWrap: "wrap",
});

export const matrixTitle = style([
  display.modalTitle,
  {
    color: vars.ink,
    lineHeight: 1,
    margin: 0,
    transition: themeTransition,
  },
]);

export const matrixSubtitle = style([
  text.label,
  {
    color: vars.muted,
    transition: themeTransition,
  },
]);

export const matrixLegend = style([
  text.microLabel,
  {
    display: "flex",
    alignItems: "center",
    gap: space["2.5"],
    color: vars.muted,
    marginLeft: "auto",
  },
]);

export const legendDot = style({
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: 2,
  marginRight: space["1"],
  verticalAlign: "middle",
});

export const legendDotRush = style({ background: vars.status.error });
export const legendDotRegular = style({ background: vars.ink });
export const legendDotNight = style({ background: vars.muted });

export const matrixEmpty = style([
  text.body,
  {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 24px",
    color: vars.muted,
    textAlign: "center",
    flexDirection: "column",
    gap: space["2"],
  },
]);

export const matrixFooter = style([
  text.label,
  {
    display: "flex",
    alignItems: "center",
    gap: space["2.5"],
    marginTop: "auto",
    padding: "8px 12px",
    borderRadius: radii.sm,
    background: vars.glass.bgSoft,
    border: `1px solid ${vars.glass.stroke}`,
    color: vars.muted,
    transition: themeTransition,
  },
]);

export const amberKeyword = style({
  color: vars.status.warning,
  fontWeight: 700,
});

export const matrixFooterAction = style({
  color: vars.status.error,
  padding: 0,
  selectors: {
    "&:hover:not(:disabled)": { color: vars.status.error, textDecoration: "underline" },
    "&:disabled": { textDecoration: "none" },
  },
});

globalStyle(`${railRow}[data-dragging="true"]`, { opacity: 0.4 });
