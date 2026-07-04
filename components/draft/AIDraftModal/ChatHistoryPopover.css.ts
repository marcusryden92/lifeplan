import { style } from "@vanilla-extract/css";
import { vars, themeTransition, radii, zIndex, popover } from "@/lib/theme";

export const menu = style([
  popover(),
  {
    zIndex: zIndex.modalOver,
    width: 280,
    maxHeight: 320,
    overflowY: "auto",
    padding: 4,
    display: "flex",
    flexDirection: "column",
    gap: 1,
  },
]);

export const stateRow = style({
  padding: "10px 12px",
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  color: vars.muted,
  textAlign: "center",
});

export const conversationRow = style({
  display: "flex",
  alignItems: "center",
  gap: 2,
});

export const conversationButton = style({
  appearance: "none",
  background: "transparent",
  border: "none",
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 1,
  padding: "6px 8px",
  borderRadius: radii.sm,
  cursor: "pointer",
  textAlign: "left",
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.interactive.hoverFill,
    },
    "&[data-current='true']": {
      background: vars.interactive.selectedFill,
    },
  },
});

export const conversationTitle = style({
  fontFamily: vars.font.ui,
  fontSize: 12,
  fontWeight: 500,
  color: vars.ink,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  transition: themeTransition,
});

export const conversationDate = style({
  fontFamily: vars.font.ui,
  fontSize: 10,
  color: vars.muted,
  transition: themeTransition,
});

export const deleteButton = style({
  appearance: "none",
  background: "transparent",
  border: "none",
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  borderRadius: radii.sm,
  cursor: "pointer",
  color: vars.muted,
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.interactive.hoverFill,
      color: vars.status.error,
    },
  },
});
