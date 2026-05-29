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
  padding: "20px 28px 18px",
  display: "flex",
  alignItems: "baseline",
  gap: 12,
  flexShrink: 0,
  "@media": {
    [MOBILE]: {
      padding: "16px 16px 12px",
      flexWrap: "wrap",
      gap: 10,
    },
  },
});

export const rangeTitle = style({
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
  gridTemplateColumns: "1fr 340px",
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
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minHeight: 0,
});

export const engineHeader = style({
  padding: "14px 18px",
  flexShrink: 0,
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
});

export const engineCard = style({
  padding: "12px 14px",
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
