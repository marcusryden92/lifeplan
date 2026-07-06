import { style, globalStyle } from "@vanilla-extract/css";
import { space, vars, themeTransition, media, radii } from "@/lib/theme";


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
    "@media": {
      [media.mobile]: { minHeight: "auto" },
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
  gap: space["2"],
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
  borderRadius: radii.pill,
  flexShrink: 0,
});

export const treeNoColor = style({
  display: "inline-block",
  width: 9,
  height: 9,
  borderRadius: radii.pill,
  border: `1px dashed ${vars.muted}`,
  opacity: 0.5,
  flexShrink: 0,
});

export const mainCard = style([
  cardBase,
  {
    "@media": {
      [media.mobile]: { minHeight: 540 },
    },
  },
]);

export const filterStrip = style({
  display: "flex",
  flexDirection: "column",
  gap: space["2.5"],
  padding: "14px 0",
  borderBottom: `1px solid ${vars.rule}`,
  flexShrink: 0,
});

export const filterRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  flexWrap: "wrap",
});

export const searchWrap = style({
  display: "flex",
  alignItems: "center",
  gap: space["1.5"],
  padding: "6px 12px",
  borderRadius: radii.pill,
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
  gap: space["2"],
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

// Columns: Title | Type | Duration | Priority | Deadline | Category | Status
// | chevron. Narrow widths drop the secondary columns (cells hidden by
// position in the globalStyle rules below) instead of forcing an
// almost-always-horizontal-scrolling table.
export const tableHead = style({
  display: "grid",
  gridTemplateColumns: "28px 1fr 80px 100px 110px 130px 120px 90px 52px",
  padding: "12px 8px 10px",
  borderBottom: `1px solid ${vars.rule}`,
  position: "sticky",
  top: 0,
  background: vars.paper,
  zIndex: 1,
  transition: themeTransition,
  "@media": {
    [media.tablet]: {
      gridTemplateColumns: "28px 1fr 80px 100px 130px 90px 52px",
    },
    [media.mobile]: {
      gridTemplateColumns: "28px 1fr 80px 110px 52px",
    },
  },
});

export const headerCell = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space["1.5"],
  paddingRight: space["3"],
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
  background: "transparent",
  border: "none",
  textAlign: "left",
  transition: themeTransition,
});

export const headerCellSortable = style({
  cursor: "pointer",
  selectors: {
    "&:hover": {
      color: vars.ink,
    },
  },
});

export const headerCellActive = style({
  color: vars.ink,
});

export const headerCellIcon = style({
  display: "inline-flex",
  alignItems: "center",
  color: "currentColor",
});

export const headerCellIconIdle = style({
  opacity: 0.45,
});

export const showCompletedToggle = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space["2"],
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: vars.muted,
  cursor: "pointer",
  userSelect: "none",
  transition: themeTransition,
});

export const tableRow = style({
  display: "grid",
  gridTemplateColumns: "28px 1fr 80px 100px 110px 130px 120px 90px 52px",
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
      background: vars.interactive.hoverFill,
    },
  },
  "@media": {
    [media.tablet]: {
      gridTemplateColumns: "28px 1fr 80px 100px 130px 90px 52px",
    },
    [media.mobile]: {
      gridTemplateColumns: "28px 1fr 80px 110px 52px",
    },
  },
});

export const tableRowSelected = style({
  background: vars.interactive.selectedFill,
  selectors: {
    "&:hover": {
      background: vars.interactive.selectedFill,
    },
  },
});

// Priority (5th) and Category (7th) go first; Duration (4th) and Status
// (8th) follow on mobile. Cells are positional in both the head and the
// rows, so the hide rules match by child index (checkbox is 1st).
globalStyle(
  `${tableHead} > :nth-child(5), ${tableHead} > :nth-child(7), ${tableRow} > :nth-child(5), ${tableRow} > :nth-child(7)`,
  {
    "@media": {
      [media.tablet]: { display: "none" },
    },
  },
);

globalStyle(
  `${tableHead} > :nth-child(4), ${tableHead} > :nth-child(8), ${tableRow} > :nth-child(4), ${tableRow} > :nth-child(8)`,
  {
    "@media": {
      [media.mobile]: { display: "none" },
    },
  },
);

export const cellCheck = style({
  display: "flex",
  alignItems: "center",
});

export const rowCheckbox = style({
  width: 15,
  height: 15,
  padding: 0,
  borderRadius: 4,
  border: `1px solid ${vars.rule}`,
  background: "transparent",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: vars.textOnAccent,
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    '&[data-checked="true"], &[data-checked="mixed"]': {
      background: vars.accent.primary,
      borderColor: vars.accent.primary,
    },
    '&:hover:not([data-checked="true"])': {
      borderColor: vars.inkSoft,
    },
  },
});

export const cellTitle = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
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
  gap: space["1"],
  color: vars.inkSoft,
  fontSize: 12.5,
  minWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
});

export const cellProgress = style({
  color: vars.inkSoft,
  fontVariantNumeric: "tabular-nums",
  fontSize: 13,
  fontFamily: vars.font.ui,
  transition: themeTransition,
});

export const cellProgressPct = style({
  color: vars.status.success,
  opacity: 1,
});

export const cellChevron = style({
  color: vars.muted,
  display: "flex",
  justifyContent: "center",
});

export const rowActions = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: space["2.5"],
  color: vars.muted,
});

export const rowMenuBtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  padding: 0,
  border: "none",
  borderRadius: radii["xs"],
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  opacity: 0,
  transition: themeTransition,
  selectors: {
    [`${tableRow}:hover &`]: {
      opacity: 1,
    },
    "&:focus-visible": {
      opacity: 1,
    },
    '&[data-state="open"]': {
      opacity: 1,
      color: vars.ink,
      background: vars.interactive.hoverFill,
    },
    "&:hover": {
      color: vars.ink,
      background: vars.interactive.hoverFill,
    },
  },
  "@media": {
    "(hover: none)": {
      opacity: 1,
    },
  },
});

export const rowMenu = style({
  display: "flex",
  flexDirection: "column",
  gap: space["0.5"],
  minWidth: 130,
});

export const rowMenuItem = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  padding: "6px 8px",
  border: "none",
  borderRadius: radii["xs"],
  background: "transparent",
  color: vars.ink,
  fontFamily: vars.font.ui,
  fontSize: 13,
  textAlign: "left",
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.interactive.hoverFill,
    },
  },
});

export const rowMenuItemDanger = style({
  color: vars.status.error,
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${vars.status.error} 12%, transparent)`,
    },
  },
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
  marginBottom: space["2"],
  transition: themeTransition,
});

