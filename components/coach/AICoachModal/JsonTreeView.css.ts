import { style, styleVariants } from "@vanilla-extract/css";
import { vars, themeTransition, radii } from "@/lib/theme";

export const wrap = style({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  borderRadius: radii["md+2"],
  border: `1px solid ${vars.rule}`,
  background: vars.paper,
  padding: 10,
  transition: themeTransition,
  // Opt back in from the global user-select: none — goal titles and fields
  // should be copyable.
  userSelect: "text",
});

export const empty = style({
  padding: 24,
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontSize: 12,
  textAlign: "center",
});

export const nodeBlock = style({
  display: "flex",
  flexDirection: "column",
});

// Collapsible goal header <button>. Emitted BEFORE the status `row` variants
// so their borderLeft/background/padding win over these UA resets; this class
// only contributes the reset, cursor, and header-weight tweaks.
export const goalRow = style({
  appearance: "none",
  background: "transparent",
  border: "none",
  width: "100%",
  textAlign: "left",
  font: "inherit",
  cursor: "pointer",
});

const rowBase = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "4px 8px",
  minWidth: 0,
  borderRadius: radii.sm,
  borderLeft: `2px solid transparent`,
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.interactive.hoverFill,
    },
  },
});

// Status-specific row treatments. Each variant gets a colored left border
// (matches the drag-and-drop indent border language) and a subtle background
// tint so the change stands out without becoming loud.
export const row = styleVariants({
  unchanged: [rowBase],
  modified: [
    rowBase,
    {
      borderLeftColor: vars.status.warning,
      background: `color-mix(in srgb, ${vars.status.warning} 8%, transparent)`,
    },
  ],
  added: [
    rowBase,
    {
      borderLeftColor: vars.status.success,
      background: `color-mix(in srgb, ${vars.status.success} 8%, transparent)`,
    },
  ],
  deleted: [
    rowBase,
    {
      borderLeftColor: vars.status.error,
      background: `color-mix(in srgb, ${vars.status.error} 8%, transparent)`,
      opacity: 0.7,
    },
  ],
});

const titleBase = style({
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  fontWeight: 500,
  color: vars.ink,
  minWidth: 0,
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  transition: themeTransition,
});

export const title = styleVariants({
  unchanged: [titleBase],
  modified: [titleBase],
  added: [titleBase],
  deleted: [
    titleBase,
    {
      textDecoration: "line-through",
      textDecorationThickness: 1.5,
      color: vars.muted,
    },
  ],
});

export const statusBadge = styleVariants({
  unchanged: [{ display: "none" }],
  modified: [
    {
      display: "inline-flex",
      alignItems: "center",
      padding: "1px 6px",
      borderRadius: radii.pill,
      fontFamily: vars.font.ui,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: vars.status.warning,
      border: `1px solid color-mix(in srgb, ${vars.status.warning} 45%, transparent)`,
      flexShrink: 0,
    },
  ],
  added: [
    {
      display: "inline-flex",
      alignItems: "center",
      padding: "1px 6px",
      borderRadius: radii.pill,
      fontFamily: vars.font.ui,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: vars.status.success,
      border: `1px solid color-mix(in srgb, ${vars.status.success} 45%, transparent)`,
      flexShrink: 0,
    },
  ],
  deleted: [
    {
      display: "inline-flex",
      alignItems: "center",
      padding: "1px 6px",
      borderRadius: radii.pill,
      fontFamily: vars.font.ui,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: vars.status.error,
      border: `1px solid color-mix(in srgb, ${vars.status.error} 45%, transparent)`,
      flexShrink: 0,
    },
  ],
});

export const metaCluster = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flexShrink: 0,
});

export const duration = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 600,
  color: vars.inkSoft,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const deadline = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  color: vars.muted,
  fontVariantNumeric: "tabular-nums",
});

export const metaSep = style({
  color: vars.rule,
  fontSize: 11,
});

export const readyDot = style({
  width: 6,
  height: 6,
  borderRadius: radii.pill,
  background: vars.status.success,
  display: "inline-block",
});

export const changedFields = style({
  fontFamily: vars.font.ui,
  fontSize: 10,
  color: vars.muted,
  fontStyle: "italic",
  flexShrink: 0,
});

// Left-indent border matches the drag-and-drop nested list convention.
export const childrenWrap = style({
  marginLeft: 12,
  paddingLeft: 10,
  borderLeft: `1px solid ${vars.rule}`,
  transition: themeTransition,
});

export const goalBlock = style({
  display: "flex",
  flexDirection: "column",
  selectors: {
    "& + &": {
      marginTop: 6,
    },
  },
});

export const goalTitle = style({
  fontSize: 13,
  fontWeight: 600,
});

export const showAllRow = style({
  appearance: "none",
  background: "transparent",
  border: "none",
  width: "100%",
  marginTop: 8,
  padding: "6px 8px",
  borderRadius: radii.sm,
  cursor: "pointer",
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 600,
  color: vars.inkSoft,
  textAlign: "center",
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.interactive.hoverFill,
      color: vars.ink,
    },
  },
});

export const chevron = style({
  flexShrink: 0,
  color: vars.inkSoft,
  transition: `transform 140ms ease, ${themeTransition}`,
  selectors: {
    "&[data-expanded='true']": {
      transform: "rotate(90deg)",
    },
  },
});
