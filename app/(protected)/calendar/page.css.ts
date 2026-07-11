import { style } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  collapseTransition,
  DURATIONS,
  glass,
  pillBtn,
  iconBtn,
  display,
  text,
  fieldLabel,
  statusTag,
  media,
  radii,
  zIndex,
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
      paddingTop: space["16"],
    },
  },
});

export const subHeader = style({
  display: "flex",
  alignItems: "center",
  // Gap matches MAIN_GRID_GAP so the action cluster's right edge lines up with
  // the calendar card's right edge (the wedge below absorbs the engine column
  // width minus this gap pair).
  gap: space["4"],
  padding: "20px 28px 18px",
  flexShrink: 0,
  minWidth: 0,
  "@media": {
    [media.tablet]: {
      flexWrap: "wrap",
    },
    [media.mobile]: {
      padding: "16px 16px 12px",
      gap: space["2.5"],
    },
  },
});

export const calendarHeaderRow = style({
  display: "contents",
});

export const rangeTitle = style([
  display.pageTitle,
  {
    color: vars.ink,
    lineHeight: 1,
    margin: 0,
    minWidth: 240,
    fontVariantNumeric: "tabular-nums",
    transition: themeTransition,
    "@media": {
      [media.mobile]: { fontSize: 24, minWidth: "auto" },
    },
  },
]);

export const dayHeaderStack = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: space["px"],
  padding: "4px 0",
});

export const dayHeaderLabel = style([
  fieldLabel,
  {
    transition: themeTransition,
  },
]);

export const dayHeaderNum = style([
  display.modalTitle,
  {
    lineHeight: 1,
    color: vars.ink,
    fontVariantNumeric: "tabular-nums",
    transition: themeTransition,
  },
]);

export const dayHeaderNumToday = style({
  color: vars.accent.now,
});

export const dayHeaderLabelToday = style({
  color: vars.accent.now,
});

export const navCluster = style({
  display: "flex",
  gap: space["1"],
  marginLeft: space["1.5"],
});

export const spacer = style({
  flex: 1,
});

// Hovered-category chip in the header. Shrinks and truncates before it can
// push the fixed clusters to its right out of the row.
export const hoverChip = style([
  text.bodySm,
  {
    display: "inline-flex",
    alignItems: "center",
    gap: space["1.5"],
    color: vars.inkSoft,
    fontWeight: 600,
    letterSpacing: "0.01em",
    minWidth: 0,
    flexShrink: 1,
  },
]);

export const hoverChipDot = style({
  width: 8,
  height: 8,
  borderRadius: radii.pill,
  flexShrink: 0,
});

export const hoverChipName = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const actionCluster = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
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
// Below the laptop breakpoint the engine console is an overlay, not a docked
// column, so there is nothing to align with — the wedge goes away entirely
// (it is also the item whose fixed width used to push the cog off-viewport).
export const headerConsoleSpacer = style({
  width: ENGINE_COL_WIDTH + MAIN_GRID_GAP - COG_WIDTH - SUBHEADER_FLEX_GAP * 2,
  flexShrink: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: space["2"],
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
    [media.laptop]: { display: "none" },
  },
});

export const headerEngineLabel = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
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

export const engineCogBtn = style([
  pillBtn({ variant: "glass", size: "sm" }),
  {
    position: "relative",
    width: COG_WIDTH,
    height: COG_WIDTH,
    justifyContent: "center",
    padding: 0,
    flexShrink: 0,
  },
]);

export const engineCogAlertDot = style({
  position: "absolute",
  top: 3,
  right: 3,
  width: 7,
  height: 7,
  borderRadius: radii.pill,
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
  position: "relative",
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
    // Engine column is an absolute overlay here (out of flow), so the grid
    // collapses to the calendar track alone.
    [media.laptop]: {
      gridTemplateColumns: "1fr",
      gap: 0,
    },
    [media.mobile]: {
      gridTemplateColumns: "1fr",
      padding: "0 0 24px",
      gap: space["3.5"],
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
        borderRadius: 0,
        borderLeftWidth: 0,
        borderRightWidth: 0,
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
  "@media": {
    // Between mobile and laptop there is no room for a docked 340px column
    // next to a usable week grid — the console floats over the calendar's
    // right edge instead. Mobile returns it to flow, stacked under the grid.
    [media.laptop]: {
      position: "absolute",
      top: 0,
      right: 28,
      bottom: 28,
      zIndex: zIndex.raised,
    },
    [media.mobile]: {
      position: "static",
      width: "auto",
    },
  },
});

export const engineContainer = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  paddingBottom: space["12"],
  paddingLeft: space["4"],
  width: 340,
  minWidth: 340,
  boxSizing: "border-box",
  "@media": {
    // Panel chrome for the overlay state — floats over the calendar card.
    [media.laptop]: {
      padding: space["4"],
      background: vars.paper,
      border: `1px solid ${vars.rule}`,
      borderRadius: radii.lg,
      boxShadow: vars.shadow.panel,
    },
    [media.mobile]: {
      width: "auto",
      minWidth: 0,
      padding: "0 0 24px",
      background: "transparent",
      border: "none",
      borderRadius: 0,
      boxShadow: "none",
    },
  },
});

export const engineHeader = style({
  padding: "0 0 14px",
  flexShrink: 0,
  borderBottom: `1px solid ${vars.rule}`,
  marginBottom: space["3.5"],
  display: "flex",
  flexDirection: "column",
  gap: space["1"],
});

export const engineTitle = style([
  display.panelTitle,
  {
    color: vars.ink,
    transition: themeTransition,
  },
]);

export const engineLastRun = style([
  text.microLabel,
  {
    color: vars.muted,
    fontVariantNumeric: "tabular-nums",
    transition: themeTransition,
  },
]);

export const engineSummary = style([
  text.label,
  {
    color: vars.inkSoft,
    transition: themeTransition,
  },
]);

export const engineList = style({
  display: "flex",
  flexDirection: "column",
  gap: space["2.5"],
  minHeight: 0,
  flex: 1,
  overflowY: "auto",
  paddingRight: space["1"],
});

export const engineControls = style({
  flexShrink: 0,
  marginTop: space["3.5"],
  paddingTop: space["3.5"],
  borderTop: `1px solid ${vars.rule}`,
  display: "flex",
  flexDirection: "column",
  gap: space["3.5"],
  transition: themeTransition,
});

export const engineControlsTitle = style([
  fieldLabel,
  {
    transition: themeTransition,
  },
]);

export const controlRow = style({
  display: "flex",
  flexDirection: "column",
  gap: space["1.5"],
});

export const controlHead = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: space["2"],
});

export const controlLabel = style([
  text.bodySm,
  {
    color: vars.inkSoft,
    transition: themeTransition,
  },
]);

export const controlValue = style([
  text.microLabel,
  {
    fontWeight: 600,
    color: vars.ink,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "0.02em",
    transition: themeTransition,
  },
]);

export const controlSlider = style({
  WebkitAppearance: "none",
  appearance: "none",
  width: "100%",
  height: 4,
  borderRadius: radii.pill,
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
      borderRadius: radii.pill,
      background: vars.ink,
      border: `2px solid ${vars.paper}`,
      cursor: "pointer",
    },
    "&::-moz-range-thumb": {
      width: 14,
      height: 14,
      borderRadius: radii.pill,
      background: vars.ink,
      border: `2px solid ${vars.paper}`,
      cursor: "pointer",
    },
  },
});

export const engineCard = style({
  position: "relative",
  padding: "10px 12px",
  borderRadius: radii["sm+2"],
  border: `1px solid ${vars.rule}`,
  background: "transparent",
  transition: themeTransition,
});

// Whole-card link overlay when the payload references a planner. Sits under
// the dismiss button so a click on × doesn't accidentally navigate.
export const engineCardLink = style({
  position: "absolute",
  inset: 0,
  borderRadius: "inherit",
  color: "transparent",
  textDecoration: "none",
  cursor: "pointer",
  zIndex: 0,
  ":focus-visible": {
    outline: `2px solid ${vars.accent.primary}`,
    outlineOffset: 2,
  },
});

// Card content sits above the link overlay so text remains selectable and
// the dismiss button remains clickable.
export const engineCardContent = style({
  position: "relative",
  zIndex: 1,
  pointerEvents: "none",
});

// `pointer-events: auto` restores clickability against the parent's
// disabled events set on engineCardContent.
const engineCardActionBtn = style([
  iconBtn({ size: "sm" }),
  {
    position: "absolute",
    top: 6,
    zIndex: 2,
    pointerEvents: "auto",
    opacity: 0.65,
    ":hover": {
      opacity: 1,
    },
    ":focus-visible": {
      outline: `2px solid ${vars.accent.primary}`,
      outlineOffset: 1,
    },
  },
]);

export const engineDismissBtn = style([engineCardActionBtn, { right: 6 }]);

export const engineGoToBtn = style([engineCardActionBtn, { right: 32 }]);

export const engineCardHead = style({
  display: "flex",
  alignItems: "flex-start",
  gap: space["2"],
  flexWrap: "wrap",
  // Reserve space for the absolute-positioned buttons in the top-right
  // corner (dismiss + optional go-to) so a long title wraps before it slides
  // under either. Sized for both buttons; cards without a go-to have a bit
  // of extra breathing room, which reads consistently.
  paddingRight: space["12"],
});

export const engineTag = style([
  statusTag,
  {
    padding: "2px 8px",
    borderRadius: radii.pill,
    color: vars.textOnAccent,
  },
]);

export const engineCardTitle = style([
  text.row,
  {
    color: vars.ink,
    lineHeight: 1.25,
    flex: 1,
    minWidth: 0,
    transition: themeTransition,
  },
]);

export const engineCardBody = style([
  text.label,
  {
    color: vars.inkSoft,
    marginTop: space["1.5"],
    lineHeight: 1.45,
    transition: themeTransition,
  },
]);

export const fcWrap = style({
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  borderRadius: radii.md,
  "@media": {
    [media.mobile]: { borderRadius: 0 },
  },
});
