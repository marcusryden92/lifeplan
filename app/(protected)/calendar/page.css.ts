import { style } from "@vanilla-extract/css";
import {
  vars,
  themeTransition,
  collapseTransition,
  DURATIONS,
  backdropFilters,
  glass,
  media,
} from "@/lib/theme";


export const page = style({
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
  alignItems: "center",
  // Gap matches MAIN_GRID_GAP so the action cluster's right edge lines up with
  // the calendar card's right edge (the wedge below absorbs the engine column
  // width minus this gap pair).
  gap: 16,
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
    [media.mobile]: { fontSize: 24, minWidth: "auto" },
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
  alignItems: "center",
  gap: 8,
  flexShrink: 0,
});

const COG_WIDTH = 32;
const ENGINE_COL_WIDTH = 340;
const MAIN_GRID_GAP = 16;
const SUBHEADER_FLEX_GAP = 16;
// engineContainer's left padding. The title inside the wedge gets the same
// padding so it lines up with the engine column's content (messages, etc.),
// not its outer edge.
const ENGINE_COL_INNER_PAD = 18;

// Collapsing wedge between the action cluster and the cog. Sized so that, when
// expanded, the wedge's left edge sits on the engine column's left edge AND
// actionCluster's right edge sits on the calendar card's right edge. With
// SUBHEADER_FLEX_GAP === MAIN_GRID_GAP, both conditions resolve cleanly.
export const headerConsoleSpacer = style({
  width: ENGINE_COL_WIDTH + MAIN_GRID_GAP - COG_WIDTH - SUBHEADER_FLEX_GAP * 2,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
  paddingLeft: ENGINE_COL_INNER_PAD,
  overflow: "hidden",
  transition: collapseTransition,
  selectors: {
    [`${page}[data-console-collapsed="true"] &`]: {
      width: 0,
      paddingLeft: 0,
    },
    [`${page}[data-no-transitions="true"] &`]: {
      transition: "none",
    },
  },
  "@media": {
    [media.mobile]: { display: "none" },
  },
});

export const headerEngineLabel = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  whiteSpace: "nowrap",
  opacity: 1,
  transition: collapseTransition,
  selectors: {
    [`${page}[data-console-collapsed="true"] &`]: {
      opacity: 0,
    },
    [`${page}[data-no-transitions="true"] &`]: {
      transition: "none",
    },
  },
});

// Mirrors the glass variant of pillBtn (lib/theme/recipes.css.ts) so it sits
// visually next to the action cluster buttons. Square icon-only footprint.
export const engineCogBtn = style({
  position: "relative",
  width: COG_WIDTH,
  height: COG_WIDTH,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  border: `1px solid ${vars.glass.stroke}`,
  background: vars.glass.bgDeep,
  backdropFilter: backdropFilters.button,
  WebkitBackdropFilter: backdropFilters.button,
  boxShadow: `inset 0 1px 0 ${vars.glass.hi}`,
  color: vars.ink,
  cursor: "pointer",
  borderRadius: 999,
  flexShrink: 0,
  transition: themeTransition,
  selectors: {
    "&:active": { transform: "scale(0.98)" },
  },
});

export const engineCogAlertDot = style({
  position: "absolute",
  top: 3,
  right: 3,
  width: 7,
  height: 7,
  borderRadius: 999,
  border: `1.5px solid ${vars.paper}`,
  transition: themeTransition,
});

export const calendarRegion = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
});

export const mainGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: MAIN_GRID_GAP,
  padding: "0 28px 28px",
  flex: 1,
  minHeight: 0,
  transition: `gap ${DURATIONS.collapse}s ease`,
  selectors: {
    [`${page}[data-console-collapsed="true"] &`]: {
      gap: 0,
    },
    [`${page}[data-no-transitions="true"] &`]: {
      transition: "none",
    },
  },
  "@media": {
    [media.mobile]: {
      gridTemplateColumns: "1fr",
      padding: "0 16px 24px",
      gap: 14,
      flex: "0 0 auto",
      minHeight: "auto",
    },
  },
});

export const calendarCard = style([
  glass({ fill: "regular", radius: "lg", shadow: "panel" }),
  {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
    "@media": {
      [media.mobile]: {
        minHeight: 540,
      },
    },
  },
]);

export const engineCol = style({
  width: ENGINE_COL_WIDTH,
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
    [`${page}[data-no-transitions="true"] &`]: {
      transition: "none",
    },
  },
});

export const engineContainer = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  paddingBottom: "50px",
  paddingLeft: "16px",
  width: 340,
  minWidth: 340,
  boxSizing: "border-box",
});

export const engineHeader = style({
  padding: "0 0 14px",
  flexShrink: 0,
  borderBottom: `1px solid ${vars.rule}`,
  marginBottom: 14,
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

export const engineTitle = style({
  fontFamily: vars.font.display,
  fontSize: 18,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  transition: themeTransition,
});

export const engineLastRun = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  color: vars.muted,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const engineSummary = style({
  fontSize: 11.5,
  color: vars.inkSoft,
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
  overflowY: "auto",
  paddingRight: 4,
});

export const engineControls = style({
  flexShrink: 0,
  marginTop: 14,
  paddingTop: 14,
  borderTop: `1px solid ${vars.rule}`,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  transition: themeTransition,
});

export const engineControlsTitle = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
  transition: themeTransition,
});

export const controlRow = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

export const controlHead = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 8,
});

export const controlLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 12,
  fontWeight: 500,
  color: vars.inkSoft,
  transition: themeTransition,
});

export const controlValue = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 600,
  color: vars.ink,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "0.02em",
  transition: themeTransition,
});

export const controlSlider = style({
  WebkitAppearance: "none",
  appearance: "none",
  width: "100%",
  height: 4,
  borderRadius: 999,
  background: vars.glass.bgDeep,
  border: `1px solid ${vars.rule}`,
  outline: "none",
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&::-webkit-slider-thumb": {
      WebkitAppearance: "none",
      appearance: "none",
      width: 14,
      height: 14,
      borderRadius: 999,
      background: vars.ink,
      border: `2px solid ${vars.paper}`,
      cursor: "pointer",
    },
    "&::-moz-range-thumb": {
      width: 14,
      height: 14,
      borderRadius: 999,
      background: vars.ink,
      border: `2px solid ${vars.paper}`,
      cursor: "pointer",
    },
  },
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
  color: vars.textOnAccent,
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
