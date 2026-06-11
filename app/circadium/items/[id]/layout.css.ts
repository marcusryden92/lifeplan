import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

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
  padding: "16px 28px 36px",
  maxWidth: 1240,
  width: "100%",
  margin: "0 auto",
  flex: 1,
  minHeight: 0,
  "@media": {
    [MOBILE]: { padding: "12px 16px 28px" },
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

export const title = style({
  fontFamily: vars.font.display,
  fontSize: 56,
  fontWeight: 500,
  letterSpacing: "-0.045em",
  lineHeight: 0.98,
  color: vars.ink,
  margin: 0,
  transition: themeTransition,
  "@media": {
    [MOBILE]: { fontSize: 38 },
  },
});

export const titleEditInput = style({
  fontFamily: vars.font.display,
  fontSize: 56,
  fontWeight: 500,
  letterSpacing: "-0.045em",
  lineHeight: 0.98,
  color: vars.ink,
  background: "transparent",
  border: "none",
  outline: "none",
  padding: 0,
  margin: 0,
  width: "100%",
  borderBottom: `2px solid ${vars.accent.primary}`,
  transition: themeTransition,
  "@media": {
    [MOBILE]: { fontSize: 38 },
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

export const headActions = style({
  display: "flex",
  gap: 8,
  flexShrink: 0,
  alignItems: "center",
});

export const tabBodyWrap = style({
  marginTop: 22,
});
