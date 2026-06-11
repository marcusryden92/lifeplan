import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

export const rootList = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: 4,
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
  marginBottom: 2,
});

export const nested = style({
  paddingLeft: 18,
  borderLeft: `1px solid ${vars.rule}`,
  marginLeft: 7,
  overflow: "hidden",
  transition: `border-color ${themeTransition}, padding 220ms ease`,
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
  paddingBottom: 2,
});

export const draggable = style({
  display: "flex",
  alignItems: "flex-start",
  width: "100%",
  borderRadius: 8,
  cursor: "pointer",
  border: "1px solid transparent",
  transition: `background-color 120ms ease, border-color 120ms ease`,
});

export const draggableHover = style({
  selectors: {
    "&:hover": {
      background: vars.glass.bgSoft,
    },
  },
});

export const draggableGrabbing = style({
  cursor: "grabbing",
});

export const draggableDropTarget = style({
  background: `color-mix(in srgb, ${vars.accent.now} 22%, transparent)`,
  borderColor: `color-mix(in srgb, ${vars.accent.now} 65%, transparent)`,
});

export const chevronBtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 30,
  marginTop: 2,
  marginRight: 2,
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  borderRadius: 6,
  transition: themeTransition,
  selectors: {
    "&:disabled": { cursor: "default", opacity: 0.4 },
    "&:not(:disabled):hover": {
      color: vars.ink,
      background: vars.glass.bgSoft,
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
  height: 30,
  marginTop: 2,
  marginRight: 2,
  border: "none",
  background: "transparent",
  color: vars.muted,
  opacity: 0,
  cursor: "grab",
  transition: `opacity 120ms ease, color 120ms ease`,
  selectors: {
    [`${draggable}:hover &`]: { opacity: 1 },
    "&:hover": { color: vars.ink },
    "&:active": { cursor: "grabbing" },
  },
});

export const dragDisableWrap = style({
  flex: 1,
  borderRadius: 8,
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
  gap: 14,
  flex: 1,
  minWidth: 0,
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
  gap: 6,
});

export const iconBtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  border: "none",
  background: "transparent",
  borderRadius: 6,
  color: vars.muted,
  cursor: "pointer",
  opacity: 0,
  transition: `opacity 120ms ease, color 120ms ease, background-color 120ms ease`,
  selectors: {
    "&:disabled": { cursor: "default" },
    "&:not(:disabled):hover": {
      color: vars.ink,
      background: vars.glass.bgSoft,
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
  paddingLeft: 12,
  paddingRight: 4,
  transition: themeTransition,
});

export const durationTextFocused = style({
  color: vars.accent.now,
});

export const editForm = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flex: 1,
  minWidth: 0,
});

export const editInput = style({
  flex: 1,
  minWidth: 0,
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: 8,
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
  borderRadius: 8,
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
  gap: 6,
  border: "none",
  background: "transparent",
  fontFamily: vars.font.ui,
  fontSize: 12,
  fontWeight: 600,
  color: vars.muted,
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: 6,
  transition: themeTransition,
  selectors: {
    "&:hover": { color: vars.ink, background: vars.glass.bgSoft },
  },
});

export const addRowRoot = style({
  paddingTop: 16,
  marginTop: 8,
  borderTop: `1px solid ${vars.rule}`,
  transition: themeTransition,
});

export const addRowInline = style({
  paddingLeft: 4,
});

export const addRowForm = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

export const dropDivider = style({
  width: "100%",
  height: 10,
  borderRadius: 3,
  position: "relative",
  transition: "background-color 80ms ease",
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      left: 0,
      right: 0,
      top: "50%",
      height: 2,
      borderRadius: 999,
      transform: "translateY(-50%)",
      background: "transparent",
      transition: "background-color 80ms ease, height 80ms ease",
    },
  },
});

export const dropDividerActive = style({
  selectors: {
    "&:hover::before": {
      background: vars.accent.now,
      height: 4,
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
  borderRadius: 999,
  boxShadow: vars.shadow.panelSm,
  zIndex: 50,
  pointerEvents: "none",
  transition: "opacity 120ms ease",
});

export const subtasksCount = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  color: vars.muted,
  fontWeight: 600,
});
