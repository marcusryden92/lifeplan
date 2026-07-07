import { style } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  radii,
  zIndex,
  formInput,
  popover,
} from "@/lib/theme";

export const wrap = style({
  position: "relative",
  display: "block",
  minWidth: 0,
});

const triggerBase = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  width: "100%",
  textAlign: "left",
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&:disabled": { cursor: "not-allowed", opacity: 0.5 },
  },
});

export const triggerBoxed = style([
  formInput({ variant: "boxed" }),
  triggerBase,
  {
    fontSize: 13,
    fontVariantNumeric: "tabular-nums",
    padding: "8px 34px 8px 12px",
  },
]);

// Matches the Capture command-bar fieldInput convention: transparent, no box.
export const triggerBare = style([
  triggerBase,
  {
    background: "transparent",
    border: "none",
    outline: "none",
    padding: "0 26px 0 0",
    height: 26,
    fontFamily: vars.font.ui,
    fontSize: 15,
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
    color: vars.ink,
  },
]);

export const triggerIcon = style({
  color: vars.muted,
  flexShrink: 0,
  transition: themeTransition,
});

export const triggerText = style({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const triggerPlaceholder = style({
  color: vars.muted,
});

export const clearBtn = style({
  position: "absolute",
  top: "50%",
  right: 6,
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: radii.pill,
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  padding: 0,
  transition: themeTransition,
  selectors: {
    "&:hover": {
      color: vars.ink,
      background: vars.interactive.hoverFill,
    },
    "&:focus-visible": {
      outline: `1px solid ${vars.accent.primary}`,
    },
  },
});

export const panel = style([
  popover({ size: "md" }),
  {
    width: 264,
    padding: space["3"],
    zIndex: zIndex.modalOver,
  },
]);

export const panelHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: space["2"],
});

export const monthLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 13,
  fontWeight: 700,
  color: vars.ink,
  transition: themeTransition,
});

export const navBtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  border: "none",
  borderRadius: radii.sm,
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  padding: 0,
  transition: themeTransition,
  selectors: {
    "&:hover": {
      color: vars.ink,
      background: vars.interactive.hoverFill,
    },
    "&:focus-visible": {
      outline: `1px solid ${vars.accent.primary}`,
    },
  },
});

export const weekHeader = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  marginBottom: space["1"],
});

export const weekHeaderCell = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: vars.muted,
  textAlign: "center",
  padding: "4px 0",
  transition: themeTransition,
});

export const dayGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: space["0.5"],
});

export const dayCell = style({
  height: 30,
  border: "1px solid transparent",
  borderRadius: radii.sm,
  background: "transparent",
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  fontWeight: 500,
  fontVariantNumeric: "tabular-nums",
  color: vars.ink,
  cursor: "pointer",
  padding: 0,
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.interactive.hoverFill,
    },
    "&:focus-visible": {
      outline: `1px solid ${vars.accent.primary}`,
    },
  },
});

export const dayCellOutside = style({
  color: vars.muted,
  opacity: 0.55,
});

export const dayCellToday = style({
  borderColor: vars.accent.now,
});

export const dayCellSelected = style({
  background: vars.accent.primary,
  color: vars.textOnAccent,
  fontWeight: 700,
  selectors: {
    "&:hover": {
      background: vars.accent.primary,
    },
  },
});

export const footer = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space["2"],
  marginTop: space["3"],
});

export const quickBtn = style({
  border: "none",
  borderRadius: radii.sm,
  background: "transparent",
  fontFamily: vars.font.ui,
  fontSize: 12,
  fontWeight: 600,
  color: vars.muted,
  cursor: "pointer",
  padding: "5px 8px",
  transition: themeTransition,
  selectors: {
    "&:hover": {
      color: vars.ink,
      background: vars.interactive.hoverFill,
    },
    "&:focus-visible": {
      outline: `1px solid ${vars.accent.primary}`,
    },
  },
});
