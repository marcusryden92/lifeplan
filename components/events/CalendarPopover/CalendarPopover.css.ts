import { style } from "@vanilla-extract/css";
import { space, vars, interactiveTransition, radii } from "@/lib/theme";

// Layout-only â€” the popover() recipe owns the glass surface (fill, blur,
// stroke, shadow, radius). This file adds the calendar-popover-specific
// positioning, sizing limits, font, and viewport guards.
export const calendarPopover = style({
  position: "fixed",
  maxWidth: "calc(100vw - 20px)",
  maxHeight: "calc(100vh - 20px)",
  zIndex: 50,
  overflow: "hidden",
  fontFamily: vars.font.ui,
  color: vars.ink,
});

// Mobile presentation: a bottom sheet instead of an anchored floating box.
// Applied alongside calendarPopover when the component detects mobile (the
// anchored inline top/left/width are skipped there, so these win).
export const calendarPopoverSheet = style({
  left: 0,
  right: 0,
  bottom: 0,
  top: "auto",
  width: "auto",
  maxWidth: "100vw",
  maxHeight: "75vh",
  overflowY: "auto",
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
});

export const header = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  padding: "10px 12px",
  borderBottom: `1px solid ${vars.rule}`,
});

export const dragHandle = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 26,
  padding: 0,
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "grab",
  borderRadius: radii.xs,
  transition: interactiveTransition("color"),
  selectors: {
    "&:hover": { color: vars.ink },
    "&:active": { cursor: "grabbing" },
  },
});

export const headerBadges = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  flex: 1,
  minWidth: 0,
  flexWrap: "wrap",
});

export const closeBtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: space["1"],
  borderRadius: radii.xs,
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  flexShrink: 0,
  transition: interactiveTransition("color", "background"),
  selectors: {
    "&:hover": { color: vars.ink, background: vars.interactive.hoverFill },
  },
});

// --- Title row (display font, fixed height, accent underline when editing)

const TITLE_FONT = 22;
const TITLE_LINE_HEIGHT = 26;
const TITLE_BORDER = 2;

export const titleRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  padding: "12px 14px 0",
});

export const titleStatic = style({
  fontFamily: vars.font.display,
  fontSize: TITLE_FONT,
  fontWeight: 500,
  letterSpacing: "-0.025em",
  lineHeight: `${TITLE_LINE_HEIGHT}px`,
  color: vars.ink,
  margin: 0,
  padding: 0,
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  height: TITLE_LINE_HEIGHT,
  boxSizing: "content-box",
  // Transparent border reserves the same vertical space the editing input's
  // accent underline occupies, so swapping in/out doesn't pop the layout.
  borderBottom: `${TITLE_BORDER}px solid transparent`,
  cursor: "text",
});

export const titleInput = style({
  fontFamily: vars.font.display,
  fontSize: TITLE_FONT,
  fontWeight: 500,
  letterSpacing: "-0.025em",
  lineHeight: `${TITLE_LINE_HEIGHT}px`,
  color: vars.ink,
  background: "transparent",
  border: "none",
  outline: "none",
  padding: 0,
  margin: 0,
  width: "100%",
  flex: 1,
  display: "block",
  boxSizing: "content-box",
  height: TITLE_LINE_HEIGHT,
  borderBottom: `${TITLE_BORDER}px solid ${vars.accent.primary}`,
});

export const renamePencil = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: space["1"],
  borderRadius: radii.xs,
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  flexShrink: 0,
  transition: interactiveTransition("color"),
  selectors: {
    "&:hover": { color: vars.ink },
  },
});

export const body = style({
  padding: "10px 14px 14px",
  display: "flex",
  flexDirection: "column",
  gap: space["3"],
});

export const metaRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  fontSize: 12.5,
  color: vars.inkSoft,
  fontFamily: vars.font.ui,
  fontVariantNumeric: "tabular-nums",
});
