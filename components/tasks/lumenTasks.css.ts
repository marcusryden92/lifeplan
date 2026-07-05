import { style, keyframes } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  interactiveTransition,
  colorMixAlpha,
  DURATIONS,
  radii,
  media,
  zIndex,
} from "@/lib/theme";

// Quick-shake when a locked completion checkbox is clicked. Subtle horizontal
// jiggle paired with a red flash on the circle gives the user immediate "no"
// feedback without making the row look broken.
const completeLockedShake = keyframes({
  "0%, 100%": { transform: "translateX(0)" },
  "20%, 60%": { transform: "translateX(-3px)" },
  "40%, 80%": { transform: "translateX(3px)" },
});

export const rootList = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: space["1"],
  selectors: {
    "&::-webkit-scrollbar": { width: 6 },
    "&::-webkit-scrollbar-thumb": {
      background: vars.rule,
      borderRadius: 3,
    },
  },
});

export const sublist = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  width: "100%",
  marginBottom: space["0.5"],
});

export const nested = style({
  // marginLeft aligns this list's left border with the parent row's chevron
  // icon center: grip (22) + grip marginRight (2) + chevron half-width (11) = 35.
  marginLeft: space["8"],
  paddingLeft: space["3"],
  borderLeft: `1px solid ${vars.rule}`,
  overflow: "hidden",
  transition: `${themeTransition}, padding ${DURATIONS.collapse}s ease`,
});

export const nestedFocused = style({
  borderLeftColor: vars.accent.now,
});

export const nestedDragged = style({
  borderLeftColor: "transparent",
});

export const itemRow = style({
  display: "flex",
  alignItems: "flex-start",
  width: "100%",
  flex: 1,
});

export const itemRowWithSubtasks = style({
  paddingBottom: space["0.5"],
});

export const draggable = style({
  display: "flex",
  alignItems: "center",
  width: "100%",
  borderRadius: radii.sm,
  cursor: "pointer",
  border: "1px solid transparent",
  transition: interactiveTransition("background-color", "border-color"),
});

export const draggableHover = style({
  selectors: {
    "&:hover": {
      background: vars.interactive.hoverFill,
    },
  },
});

export const draggableGrabbing = style({
  cursor: "grabbing",
});

export const draggableDropTarget = style({
  background: `color-mix(in srgb, ${vars.accent.now} ${colorMixAlpha.hoverFill}%, transparent)`,
  borderColor: `color-mix(in srgb, ${vars.accent.now} 65%, transparent)`,
});

export const draggableSelected = style({
  background: `color-mix(in srgb, ${vars.accent.now} ${colorMixAlpha.subtleFill}%, transparent)`,
});

// Post-drop landing feedback: the moved row glows at the drop-target tint and
// fades, so the item is findable wherever it landed in the list.
const dropFlash = keyframes({
  "0%": {
    background: `color-mix(in srgb, ${vars.accent.now} ${colorMixAlpha.hoverFill}%, transparent)`,
  },
  "100%": { background: "transparent" },
});

export const draggableDropped = style({
  animation: `${dropFlash} 0.7s ease-out`,
});

// Note: short explicit transition rather than themeTransition (1s) â€” completion
// state flips on click and needs to feel immediate, not crossfaded.
const COMPLETE_TRANSITION = interactiveTransition(
  "background-color",
  "border-color",
  "color",
);

export const completeBtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 26,
  marginRight: space["0.5"],
  border: "none",
  background: "transparent",
  cursor: "pointer",
  borderRadius: radii.xs,
  padding: 0,
  color: vars.muted,
  transition: COMPLETE_TRANSITION,
  selectors: {
    "&:hover": {
      color: vars.ink,
      background: vars.interactive.hoverFill,
    },
    "&[data-shake='true']": {
      animation: `${completeLockedShake} 0.4s ease-in-out`,
    },
    "&[data-locked='true']": {
      cursor: "not-allowed",
    },
  },
});

export const completeCircle = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 16,
  height: 16,
  borderRadius: radii.pill,
  border: `1.5px solid currentColor`,
  background: "transparent",
  transition: COMPLETE_TRANSITION,
  selectors: {
    [`${completeBtn}[data-completed="true"] &`]: {
      background: vars.status.success,
      borderColor: vars.status.success,
      color: vars.paper,
    },
    [`${completeBtn}[data-shake='true'] &`]: {
      borderColor: vars.status.error,
      color: vars.status.error,
    },
  },
});

export const taskTitleCompleted = style({
  color: vars.muted,
  textDecoration: "line-through",
  textDecorationThickness: 1.5,
});

export const chevronBtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 26,
  marginRight: space["0.5"],
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  borderRadius: radii.xs,
  transition: themeTransition,
  selectors: {
    "&:disabled": { cursor: "default", opacity: 0.4 },
    "&:not(:disabled):hover": {
      color: vars.ink,
      background: vars.interactive.hoverFill,
    },
  },
});

export const chevronBtnFocused = style({
  color: vars.accent.now,
});

export const gripBtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 26,
  marginRight: space["0.5"],
  border: "none",
  background: "transparent",
  color: vars.muted,
  opacity: 0,
  cursor: "grab",
  transition: interactiveTransition("opacity", "color"),
  selectors: {
    [`${draggable}:hover &`]: { opacity: 1 },
    "&:hover": { color: vars.ink },
    "&:active": { cursor: "grabbing" },
  },
  // No hover on touch: the handle is always visible on mobile, where it
  // opens the move menu instead of starting a mouse drag.
  "@media": {
    [media.mobile]: { opacity: 1, cursor: "pointer" },
  },
});

export const gripWrap = style({
  position: "relative",
  display: "inline-flex",
});

// Touch-reorder menu anchored to the grip on mobile (the mouse drag system
// never fires on touch). Plain popover panel; rendered only while open.
export const moveMenu = style({
  position: "absolute",
  top: "100%",
  left: 0,
  zIndex: zIndex.floating,
  minWidth: 170,
  display: "flex",
  flexDirection: "column",
  padding: space["1"],
  background: vars.paper,
  border: `1px solid ${vars.rule}`,
  borderRadius: radii["sm+2"],
  boxShadow: vars.shadow.panelSm,
});

export const moveMenuItem = style({
  appearance: "none",
  border: "none",
  background: "transparent",
  textAlign: "left",
  padding: "8px 10px",
  borderRadius: radii.sm,
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  fontWeight: 500,
  color: vars.ink,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: interactiveTransition("background-color", "color"),
  selectors: {
    "&:hover:not(:disabled)": { background: vars.interactive.hoverFill },
    "&:disabled": { color: vars.muted, cursor: "default" },
  },
});

export const dragDisableWrap = style({
  flex: 1,
  borderRadius: radii.sm,
});

export const dragDisableWrapDragged = style({
  background: vars.glass.bgSoft,
  opacity: 0.4,
  pointerEvents: "none",
});

export const headerRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flex: 1,
  minWidth: 0,
  fontSize: 13.5,
  fontFamily: vars.font.ui,
  padding: "6px 8px",
});

export const headerRowDragged = style({
  background: vars.glass.bgSoft,
  opacity: 0.4,
});

export const headerInner = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  flex: 1,
  minWidth: 0,
});

export const addChildBtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: radii.xs,
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  opacity: 0,
  transition: interactiveTransition("opacity", "color", "background-color"),
  flexShrink: 0,
  selectors: {
    [`${draggable}:hover &`]: { opacity: 1 },
    "&:hover": { color: vars.ink, background: vars.interactive.hoverFill },
  },
});

export const headerInnerDim = style({
  opacity: 0.5,
});

export const taskTitle = style({
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  fontWeight: 500,
  color: vars.ink,
  minWidth: 0,
  flexShrink: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  transition: themeTransition,
});

export const taskTitleFocused = style({
  color: vars.accent.now,
  fontWeight: 600,
});

export const iconRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["1.5"],
});

export const iconBtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  border: "none",
  background: "transparent",
  borderRadius: radii.xs,
  color: vars.muted,
  cursor: "pointer",
  opacity: 0,
  transition: interactiveTransition("opacity", "color", "background-color"),
  selectors: {
    "&:disabled": { cursor: "default" },
    "&:not(:disabled):hover": {
      color: vars.ink,
      background: vars.interactive.hoverFill,
    },
  },
});

export const iconBtnVisible = style({
  opacity: 1,
});

export const iconBtnDanger = style({
  selectors: {
    "&:not(:disabled):hover": {
      color: vars.status.error,
      background: `color-mix(in srgb, ${vars.status.error} 12%, transparent)`,
    },
  },
});

export const durationText = style({
  fontSize: 12.5,
  fontFamily: vars.font.ui,
  fontWeight: 600,
  color: vars.inkSoft,
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
  paddingLeft: space["3"],
  paddingRight: space["1"],
  transition: themeTransition,
});

export const durationTextFocused = style({
  color: vars.accent.now,
});

export const editForm = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  flex: 1,
  minWidth: 0,
});

export const editInput = style({
  flex: 1,
  minWidth: 0,
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: radii.sm,
  padding: "5px 10px",
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  color: vars.ink,
  outline: "none",
  transition: themeTransition,
  selectors: {
    "&:focus": { borderColor: vars.accent.primary },
  },
});

export const editDurationInput = style({
  width: 72,
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: radii.sm,
  padding: "5px 10px",
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  color: vars.ink,
  outline: "none",
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
  selectors: {
    "&:focus": { borderColor: vars.accent.primary },
  },
});

export const addSubtaskTrigger = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space["1.5"],
  border: "none",
  background: "transparent",
  fontFamily: vars.font.ui,
  fontSize: 12,
  fontWeight: 600,
  color: vars.muted,
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: radii.xs,
  transition: themeTransition,
  selectors: {
    "&:hover": { color: vars.ink, background: vars.interactive.hoverFill },
  },
});

export const addRowRoot = style({
  paddingTop: space["4"],
  paddingRight: space["3.5"],
  marginTop: space["2"],
  borderTop: `1px solid ${vars.rule}`,
  transition: themeTransition,
});

export const addRowInline = style({
  paddingLeft: space["1"],
});

export const addRowForm = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
});

export const dropDivider = style({
  width: "100%",
  height: 10,
  borderRadius: 3,
  position: "relative",
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      left: 0,
      right: 0,
      top: "50%",
      height: 2,
      borderRadius: radii.pill,
      transform: "translateY(-50%)",
      background: "transparent",
    },
  },
});

export const dropDividerActive = style({
  selectors: {
    // Transition declared on the hover state only: the accent line eases in,
    // but snaps off the instant the hover or drag ends. A fade-out here reads
    // as a flash after a drop — the mounted row pushes the divider down while
    // the stale accent line is still fading on it.
    "&:hover::before": {
      background: vars.accent.now,
      height: 4,
      transition: "background-color 80ms ease, height 80ms ease",
    },
  },
});

export const dragBox = style({
  position: "fixed",
  top: 0,
  left: 0,
  padding: "6px 14px",
  background: vars.ink,
  color: vars.paper,
  fontFamily: vars.font.ui,
  fontSize: 13,
  fontWeight: 600,
  borderRadius: radii.pill,
  boxShadow: vars.shadow.panelSm,
  zIndex: 50,
  pointerEvents: "none",
  transition: interactiveTransition("opacity"),
});

export const subtasksCount = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  color: vars.muted,
  fontWeight: 600,
});
