import { style, globalStyle } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

export const page = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
  "@media": {
    [MOBILE]: { flex: "0 0 auto", minHeight: "auto" },
  },
});

export const subHeader = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "20px 28px 18px",
  flexShrink: 0,
  flexWrap: "wrap",
  "@media": {
    [MOBILE]: { padding: "16px 16px 12px", gap: 10 },
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
    [MOBILE]: { fontSize: 24 },
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

export const spacer = style({ flex: 1 });

export const headActions = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexShrink: 0,
  flexWrap: "wrap",
  // marginLeft: auto keeps the cluster right-aligned even when the parent
  // subHeader wraps it onto its own row — without it, a wrapped row reverts
  // to the left edge and the title sits visually orphaned.
  marginLeft: "auto",
});

// Matches the segmented control in the library filter strip: a relatively
// positioned pill with an absolute ink thumb that slides between options.
export const segmentedControl = style({
  position: "relative",
  display: "inline-grid",
  padding: 3,
  borderRadius: 999,
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
});

export const segmentedThumb = style({
  position: "absolute",
  top: 3,
  bottom: 3,
  left: 3,
  borderRadius: 999,
  background: vars.ink,
  transition:
    "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), width 0.22s ease",
  zIndex: 0,
});

export const segmentedButton = style({
  position: "relative",
  zIndex: 1,
  appearance: "none",
  border: "none",
  background: "transparent",
  padding: "5px 14px",
  borderRadius: 999,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  fontSize: 11,
  fontFamily: vars.font.ui,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: vars.muted,
  transition: "color 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
  selectors: {
    "&[data-active='true']": { color: vars.paper },
    "&:hover:not([data-active='true'])": { color: vars.ink },
  },
});

export const banner = style({
  margin: "0 28px 12px",
  padding: "8px 12px",
  borderRadius: 10,
  fontSize: 12.5,
  fontFamily: vars.font.ui,
  fontWeight: 500,
  transition: themeTransition,
});

export const successBanner = style([
  banner,
  {
    background: `color-mix(in srgb, ${vars.status.success} 14%, transparent)`,
    border: `1px solid ${vars.status.success}`,
    color: vars.status.success,
  },
]);

export const errorBanner = style([
  banner,
  {
    background: `color-mix(in srgb, ${vars.status.error} 14%, transparent)`,
    border: `1px solid ${vars.status.error}`,
    color: vars.status.error,
  },
]);

export const mainGrid = style({
  display: "grid",
  gridTemplateColumns: "300px 1fr",
  gap: 16,
  padding: "0 28px 28px",
  flex: 1,
  minHeight: 0,
  "@media": {
    [MOBILE]: {
      gridTemplateColumns: "1fr",
      padding: "0 16px 24px",
      gap: 14,
      flex: "0 0 auto",
      minHeight: "auto",
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
    borderRadius: 14,
    padding: "12px 8px 8px",
    background: "transparent",
    transition: themeTransition,
    "@media": {
      [MOBILE]: { minHeight: "auto", borderRadius: 12 },
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
  gap: 4,
});

export const railRow = style({
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  padding: "8px 8px",
  borderRadius: 8,
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
    "&:hover": { background: vars.glass.bgSoft },
  },
});

export const railRowPin = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 16,
  height: 16,
  color: vars.muted,
  flexShrink: 0,
  marginTop: 2,
});

export const railRowMeta = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  flex: 1,
  minWidth: 0,
});

export const railRowName = style({
  fontWeight: 600,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const railRowAddress = style({
  fontSize: 11,
  color: vars.muted,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontVariantNumeric: "tabular-nums",
});

export const railRowTags = style({
  marginTop: 4,
  display: "flex",
  flexWrap: "wrap",
  gap: 3,
});

export const railRowTag = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
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
  borderRadius: 999,
  flexShrink: 0,
});

export const railFooter = style({
  flexShrink: 0,
  marginTop: 8,
  paddingTop: 8,
  paddingLeft: 4,
  paddingRight: 4,
  borderTop: `1px solid ${vars.rule}`,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  transition: themeTransition,
});

export const railNote = style({
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  color: vars.muted,
  textAlign: "center",
  padding: "0 6px",
  transition: themeTransition,
});

export const railNewButton = style({
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "8px 10px",
  borderRadius: 8,
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
      background: vars.glass.bgSoft,
    },
    "&:disabled": {
      opacity: 0.4,
      cursor: "not-allowed",
    },
  },
});

export const matrixPane = style([
  cardBase,
  {
    border: `1px solid ${vars.rule}`,
    borderRadius: 14,
    padding: "16px 18px",
    gap: 12,
    overflow: "auto",
    transition: themeTransition,
    "@media": {
      [MOBILE]: { minHeight: 540, borderRadius: 12 },
    },
  },
]);

export const matrixHead = style({
  display: "flex",
  alignItems: "baseline",
  gap: 12,
  flexWrap: "wrap",
});

export const matrixTitle = style({
  fontFamily: vars.font.display,
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  lineHeight: 1,
  margin: 0,
  transition: themeTransition,
});

export const matrixSubtitle = style({
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  color: vars.muted,
  transition: themeTransition,
});

export const matrixLegend = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 11,
  color: vars.muted,
  fontFamily: vars.font.ui,
  marginLeft: "auto",
});

export const legendDot = style({
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: 2,
  marginRight: 4,
  verticalAlign: "middle",
});

export const legendDotRush = style({ background: vars.status.error });
export const legendDotRegular = style({ background: vars.ink });
export const legendDotNight = style({ background: vars.muted });

export const matrixEmpty = style({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "60px 24px",
  fontFamily: vars.font.ui,
  fontSize: 13,
  color: vars.muted,
  textAlign: "center",
  flexDirection: "column",
  gap: 8,
});

export const matrixFooter = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: "auto",
  padding: "8px 12px",
  borderRadius: 8,
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  fontSize: 11.5,
  fontFamily: vars.font.ui,
  color: vars.muted,
  transition: themeTransition,
});

export const matrixFooterAction = style({
  background: "transparent",
  border: "none",
  color: vars.status.error,
  cursor: "pointer",
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  fontWeight: 600,
  padding: 0,
  selectors: {
    "&:hover": { textDecoration: "underline" },
    "&:disabled": { opacity: 0.5, cursor: "not-allowed", textDecoration: "none" },
  },
});

globalStyle(`${railRow}[data-dragging="true"]`, { opacity: 0.4 });
