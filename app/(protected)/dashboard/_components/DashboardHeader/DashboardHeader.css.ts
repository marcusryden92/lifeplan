import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

export const headerRow = style({
  padding: "30px 32px 22px",
  flexShrink: 0,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 24,
  "@media": {
    [MOBILE]: {
      padding: "22px 18px 16px",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 14,
    },
  },
});

export const greeting = style({
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

export const summaryLine = style({
  marginTop: 10,
  fontSize: 14,
  color: vars.inkSoft,
  fontWeight: 500,
  fontFamily: vars.font.ui,
  transition: themeTransition,
});

export const summaryStrong = style({
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
  color: vars.ink,
  transition: themeTransition,
});

export const summaryError = style({
  color: vars.status.error,
  fontWeight: 600,
  transition: themeTransition,
});

export const headerActions = style({
  display: "flex",
  gap: 8,
  flexShrink: 0,
  "@media": {
    [MOBILE]: { width: "100%" },
  },
});
