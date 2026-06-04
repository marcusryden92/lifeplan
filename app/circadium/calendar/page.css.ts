import { style } from "@vanilla-extract/css";
import { vars, themeTransition, collapseTransition, DURATIONS } from "@/lib/theme";

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

export const calendarHeaderRow = style({
  display: "contents",
});

export const rangeTitle = style({
  fontFamily: vars.font.display,
  fontSize: 32,
  fontWeight: 500,
  letterSpacing: "-0.03em",
  color: vars.ink,
  lineHeight: 1,
  margin: 0,
  minWidth: 240,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
  "@media": {
    [MOBILE]: { fontSize: 24, minWidth: "auto" },
  },
});

export const dayHeaderStack = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 1,
  padding: "4px 0",
});

export const dayHeaderLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
  transition: themeTransition,
});

export const dayHeaderNum = style({
  fontFamily: vars.font.display,
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: "-0.03em",
  lineHeight: 1,
  color: vars.ink,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const dayHeaderNumToday = style({
  color: vars.accent.now,
});

export const dayHeaderLabelToday = style({
  color: vars.accent.now,
});

export const navCluster = style({
  display: "flex",
  gap: 4,
  marginLeft: 6,
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
  gridTemplateColumns: "1fr auto",
  gap: 16,
  padding: "0 28px 28px",
  flex: 1,
  minHeight: 0,
  transition: `gap ${DURATIONS.collapse}s ease`,
  selectors: {
    [`${page}[data-console-collapsed="true"] &`]: {
      gap: 0,
    },
  },
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

export const calendarCard = style({
  background: vars.glass.bg,
  border: `1px solid ${vars.glass.stroke}`,
  boxShadow: vars.shadow.panel,
  borderRadius: 22,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
  transition: themeTransition,
  "@media": {
    [MOBILE]: {
      minHeight: 540,
    },
  },
});

export const engineCol = style({
  width: 340,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  minWidth: 0,
  overflow: "hidden",
  opacity: 1,
  transition: collapseTransition,
  selectors: {
    [`${page}[data-console-collapsed="true"] &`]: {
      width: 0,
      opacity: 0,
      pointerEvents: "none",
    },
  },
});

export const engineContainer = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  padding: "16px 18px",
  width: 340,
  minWidth: 340,
  boxSizing: "border-box",
});

export const engineHeader = style({
  padding: "0 0 14px",
  flexShrink: 0,
  borderBottom: `1px solid ${vars.rule}`,
  marginBottom: 14,
});

export const engineHeaderRow = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

export const engineTitle = style({
  fontFamily: vars.font.display,
  fontSize: 18,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  transition: themeTransition,
});

export const engineSpacer = style({
  marginLeft: "auto",
});

export const engineSummary = style({
  fontSize: 11.5,
  color: vars.inkSoft,
  marginTop: 5,
  fontWeight: 500,
  fontFamily: vars.font.ui,
  transition: themeTransition,
});

export const engineList = style({
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minHeight: 0,
  flex: 1,
});

export const engineCard = style({
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${vars.rule}`,
  background: "transparent",
  transition: themeTransition,
});

export const engineCardHead = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
});

export const engineTag = style({
  padding: "2px 8px",
  borderRadius: 999,
  color: "#fff",
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: "0.08em",
  fontFamily: vars.font.ui,
});

export const engineCardTitle = style({
  fontFamily: vars.font.display,
  fontSize: 13.5,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  lineHeight: 1.25,
  flex: 1,
  minWidth: 0,
  transition: themeTransition,
});

export const engineCardBody = style({
  fontSize: 11.5,
  color: vars.inkSoft,
  marginTop: 6,
  lineHeight: 1.45,
  fontFamily: vars.font.ui,
  fontWeight: 500,
  transition: themeTransition,
});

export const fcWrap = style({
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  borderRadius: 22,
});
