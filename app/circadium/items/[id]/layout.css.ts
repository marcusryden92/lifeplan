import { style } from "@vanilla-extract/css";
import { vars, themeTransition, interactiveTransition } from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

export const page = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
  overflow: "auto",
});

export const innerWrap = style({
  display: "flex",
  flexDirection: "column",
  padding: "20px 56px 28px",
  width: "100%",
  flex: 1,
  minHeight: 0,
  "@media": {
    [MOBILE]: { padding: "16px 32px 24px" },
  },
});

export const backRow = style({
  display: "flex",
  alignItems: "center",
  paddingBottom: 6,
});

export const backLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: vars.font.ui,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: vars.muted,
  background: "transparent",
  border: "none",
  padding: "6px 0",
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&:hover": { color: vars.ink },
  },
});

export const titleBlock = style({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 24,
  marginTop: 14,
  "@media": {
    [MOBILE]: {
      flexDirection: "column",
      alignItems: "stretch",
      gap: 14,
    },
  },
});

// Shared geometry so display ↔ edit doesn't push following content.
const TITLE_FONT = 56;
const TITLE_LINE_HEIGHT = 56; // px — explicit, not multiplier
const TITLE_BORDER = 2;

export const title = style({
  fontFamily: vars.font.display,
  fontSize: TITLE_FONT,
  fontWeight: 500,
  letterSpacing: "-0.045em",
  lineHeight: `${TITLE_LINE_HEIGHT}px`,
  color: vars.ink,
  margin: 0,
  padding: 0,
  display: "block",
  boxSizing: "content-box",
  borderBottom: `${TITLE_BORDER}px solid transparent`,
  transition: themeTransition,
  "@media": {
    [MOBILE]: { fontSize: 38, lineHeight: "38px" },
  },
});

export const titleEditInput = style({
  fontFamily: vars.font.display,
  fontSize: TITLE_FONT,
  fontWeight: 500,
  letterSpacing: "-0.045em",
  lineHeight: `${TITLE_LINE_HEIGHT}px`,
  color: vars.ink,
  background: "transparent",
  border: "none",
  outline: "none",
  padding: 0,
  margin: 0,
  width: "100%",
  display: "block",
  boxSizing: "content-box",
  height: TITLE_LINE_HEIGHT,
  borderBottom: `${TITLE_BORDER}px solid ${vars.accent.primary}`,
  transition: themeTransition,
  "@media": {
    [MOBILE]: { fontSize: 38, lineHeight: "38px", height: 38 },
  },
});

export const titleClickable = style({
  cursor: "text",
  selectors: {
    "&:hover": { opacity: 0.85 },
  },
});

export const editableTitleWrap = style({
  flex: 1,
  minWidth: 0,
});

export const titleHoverRow = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
});

export const renamePencil = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "flex-start",
  width: 30,
  height: 30,
  marginTop: 4,
  borderRadius: 999,
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  opacity: 0,
  flexShrink: 0,
  transition: interactiveTransition("opacity", "color", "background-color"),
  selectors: {
    [`${titleHoverRow}:hover &`]: { opacity: 1 },
    "&:hover": { color: vars.ink, background: vars.glass.bgSoft },
  },
});

export const headActions = style({
  display: "flex",
  gap: 16,
  flexShrink: 0,
  alignItems: "flex-end",
});

export const readyCluster = style({
  position: "relative",
  minWidth: 124,
});

export const readyHint = style({
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  right: 0,
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  lineHeight: 1.35,
  color: vars.muted,
  textAlign: "center",
  fontWeight: 500,
  letterSpacing: "0.02em",
});

export const headActionsCluster = style({
  display: "flex",
  gap: 8,
  alignItems: "center",
});

export const tabBodyWrap = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
});
