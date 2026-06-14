import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

export const page = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
  "@media": {
    [MOBILE]: {
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
    [MOBILE]: {
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
    "@media": {
      [MOBILE]: { minHeight: "auto" },
    },
  },
]);

export const railSection = style({
  display: "flex",
  flexDirection: "column",
  padding: "14px 12px 12px",
  borderBottom: `1px solid ${vars.rule}`,
  selectors: {
    "&:last-child": {
      borderBottom: "none",
      flex: 1,
      minHeight: 0,
      overflow: "auto",
    },
  },
});

export const railSectionHead = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
  padding: "0 8px 6px",
  transition: themeTransition,
});

export const railRow = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "5px 8px",
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
    "&:hover": {
      background: vars.glass.bgSoft,
    },
  },
});

export const railRowActive = style({
  background: vars.glass.bgDeep,
  borderColor: vars.glass.stroke,
  fontWeight: 600,
});

export const railRowIcon = style({
  display: "inline-flex",
  width: 16,
  justifyContent: "center",
  color: vars.muted,
  transition: themeTransition,
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

export const railRowCountAlert = style({
  color: vars.status.error,
  fontWeight: 700,
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

export const treeColorDot = style({
  display: "inline-block",
  width: 9,
  height: 9,
  borderRadius: 999,
  flexShrink: 0,
});

export const treeNoColor = style({
  display: "inline-block",
  width: 9,
  height: 9,
  borderRadius: 999,
  border: `1px dashed ${vars.muted}`,
  opacity: 0.5,
  flexShrink: 0,
});

export const mainCard = style([
  cardBase,
  {
    "@media": {
      [MOBILE]: { minHeight: 540 },
    },
  },
]);

export const filterStrip = style({
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: "14px 0",
  borderBottom: `1px solid ${vars.rule}`,
  flexShrink: 0,
});

export const filterRow = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
});

export const searchWrap = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 999,
  border: `1px solid ${vars.glass.stroke}`,
  background: vars.glass.bgSoft,
  flex: 1,
  minWidth: 220,
  transition: themeTransition,
});

export const searchInput = style({
  border: "none",
  outline: "none",
  background: "transparent",
  fontSize: 13,
  fontFamily: vars.font.ui,
  color: vars.ink,
  flex: 1,
  selectors: {
    "&::placeholder": {
      color: vars.muted,
    },
  },
});

export const breadcrumb = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 0",
  borderBottom: `1px solid ${vars.rule}`,
  fontSize: 13,
  color: vars.inkSoft,
  fontFamily: vars.font.ui,
  flexShrink: 0,
  transition: themeTransition,
});

export const breadcrumbSep = style({
  color: vars.muted,
});

export const breadcrumbCurrent = style({
  color: vars.ink,
  fontWeight: 600,
});

export const tableWrap = style({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  padding: "0 0 18px",
});

export const tableHead = style({
  display: "grid",
  gridTemplateColumns: "1fr 80px 90px 130px 110px 90px 30px",
  padding: "12px 8px 10px",
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
  borderBottom: `1px solid ${vars.rule}`,
  position: "sticky",
  top: 0,
  background: vars.paper,
  zIndex: 1,
  transition: themeTransition,
});

export const tableRow = style({
  display: "grid",
  gridTemplateColumns: "1fr 80px 90px 130px 110px 90px 30px",
  padding: "12px 8px",
  alignItems: "center",
  borderBottom: `1px solid ${vars.rule}`,
  fontSize: 13.5,
  fontFamily: vars.font.ui,
  color: vars.ink,
  cursor: "pointer",
  background: "transparent",
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.glass.bgSoft,
    },
  },
});

export const cellTitle = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});

export const titleText = style({
  fontWeight: 500,
  color: vars.ink,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  flex: 1,
  minWidth: 0,
});

export const cellMuted = style({
  color: vars.inkSoft,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const cellOverdue = style({
  color: vars.status.error,
  fontWeight: 600,
});

export const cellLocation = style({
  display: "flex",
  alignItems: "center",
  gap: 4,
  color: vars.inkSoft,
  fontSize: 12.5,
  minWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
});

export const cellChevron = style({
  color: vars.muted,
  display: "flex",
  justifyContent: "center",
});

export const emptyState = style({
  padding: "60px 24px",
  textAlign: "center",
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontSize: 14,
});

export const emptyStateTitle = style({
  fontFamily: vars.font.display,
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  marginBottom: 8,
  transition: themeTransition,
});

export const segmentedControl = style({
  display: "inline-flex",
  padding: 3,
  borderRadius: 999,
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  gap: 2,
});

export const segmentedButton = style({
  border: "none",
  background: "transparent",
  padding: "5px 12px",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 11.5,
  fontFamily: vars.font.ui,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: vars.muted,
  transition: themeTransition,
});

export const segmentedButtonActive = style({
  background: vars.ink,
  color: vars.paper,
});
