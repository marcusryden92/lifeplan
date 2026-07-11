import { style, globalStyle } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  collapseTransition,
  media,
  radii,
  iconBtn,
  display,
  text,
  fieldLabel,
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
  gridTemplateColumns: "auto 1fr",
  gap: space["6"],
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
    width: 260,
    minWidth: 0,
    borderRight: `1px solid ${vars.rule}`,
    marginTop: space["2.5"],
    transition: collapseTransition,
    "@media": {
      [media.mobile]: { minHeight: "auto" },
      // Below tablet the rail stacks full-width; the fixed width comes off.
      [media.tablet]: { width: "auto" },
    },
    selectors: {
      [`${page}[data-rail-collapsed="true"] &`]: {
        width: 44,
        "@media": {
          [media.tablet]: { width: "auto" },
        },
      },
      [`${page}[data-no-transitions="true"] &`]: {
        transition: "none",
      },
    },
  },
]);

export const railHeader = style({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  padding: "0px 8px 4px",
  flexShrink: 0,
  selectors: {
    [`${page}[data-rail-collapsed="true"] &`]: {
      justifyContent: "center",
      paddingBottom: space["1"],
    },
  },
  "@media": {
    [media.tablet]: { display: "none" },
  },
});

export const railToggle = iconBtn();

export const railToggleIcon = style({
  display: "inline-flex",
  color: vars.muted,
  transition: collapseTransition,
  selectors: {
    [`${page}[data-rail-collapsed="true"] &`]: {
      transform: "rotate(180deg)",
    },
    [`${page}[data-no-transitions="true"] &`]: {
      transition: "none",
    },
  },
});

export const railSection = style({
  display: "flex",
  flexDirection: "column",
  padding: "14px 12px 12px",
  borderBottom: `1px solid ${vars.rule}`,
  // Pinned to the expanded width so it never reflows while the rail animates;
  // the rail's overflow:hidden clips it and opacity fades it, making collapse
  // and expand mirror animations instead of an abrupt hide.
  width: 260,
  alignSelf: "flex-start",
  opacity: 1,
  transition: collapseTransition,
  "@media": {
    [media.tablet]: { width: "auto", alignSelf: "stretch" },
  },
  selectors: {
    "&:last-child": {
      borderBottom: "none",
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      overflowX: "hidden",
    },
    [`${page}[data-rail-collapsed="true"] &`]: {
      opacity: 0,
      pointerEvents: "none",
      "@media": {
        [media.tablet]: { opacity: 1, pointerEvents: "auto" },
      },
    },
    [`${page}[data-no-transitions="true"] &`]: {
      transition: "none",
    },
  },
});

export const railSectionHead = style([
  fieldLabel,
  {
    padding: "0 8px 6px",
    transition: themeTransition,
  },
]);

export const railRow = style([
  text.row,
  {
    gap: space["2"],
    color: vars.ink,
    background: "transparent",
    border: "1px solid transparent",
    textAlign: "left",
    width: "100%",
  },
]);

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

// Bare <Input> inside the search pill; the pill owns the box.
export const searchInput = style({ flex: 1 });

export const breadcrumb = style([
  text.body,
  {
    display: "flex",
    alignItems: "center",
    gap: space["2"],
    padding: "12px 0",
    borderBottom: `1px solid ${vars.rule}`,
    color: vars.inkSoft,
    flexShrink: 0,
    transition: themeTransition,
  },
]);

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

export const headerCell = style([
  fieldLabel,
  {
    display: "inline-flex",
    alignItems: "center",
    gap: space["1.5"],
    paddingRight: space["3"],
    background: "transparent",
    border: "none",
    textAlign: "left",
    transition: themeTransition,
  },
]);

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

export const showCompletedToggle = style([
  text.microLabel,
  {
    display: "inline-flex",
    alignItems: "center",
    gap: space["2"],
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: vars.muted,
    cursor: "pointer",
    userSelect: "none",
    transition: themeTransition,
  },
]);

export const tableRow = style([
  text.row,
  {
    display: "grid",
    gridTemplateColumns: "28px 1fr 80px 100px 110px 130px 120px 90px 52px",
    padding: "12px 8px",
    alignItems: "center",
    borderBottom: `1px solid ${vars.rule}`,
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
  },
]);

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
  borderRadius: radii.xs,
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

export const cellLocation = style([
  text.bodySm,
  {
    display: "flex",
    alignItems: "center",
    gap: space["1"],
    color: vars.inkSoft,
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
]);

export const cellProgress = style([
  text.body,
  {
    color: vars.inkSoft,
    fontVariantNumeric: "tabular-nums",
    transition: themeTransition,
  },
]);

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
  color: vars.muted,
  opacity: 0,
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

export const rowMenuItem = style([
  text.body,
  {
    display: "flex",
    alignItems: "center",
    gap: space["2"],
    padding: "6px 8px",
    border: "none",
    borderRadius: radii["xs"],
    background: "transparent",
    color: vars.ink,
    textAlign: "left",
    cursor: "pointer",
    transition: themeTransition,
    selectors: {
      "&:hover": {
        background: vars.interactive.hoverFill,
      },
    },
  },
]);

export const rowMenuItemDanger = style({
  color: vars.status.error,
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${vars.status.error} 12%, transparent)`,
    },
  },
});

export const emptyState = style([
  text.bodyLg,
  {
    padding: "60px 24px",
    textAlign: "center",
    color: vars.muted,
  },
]);

export const emptyStateTitle = style([
  display.modalTitle,
  {
    color: vars.ink,
    marginBottom: space["2"],
    transition: themeTransition,
  },
]);
