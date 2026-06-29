import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

export const goalsCard = style({
  padding: "16px 20px",
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  "@media": {
    [MOBILE]: {
      flex: "0 0 auto",
      minHeight: "auto",
    },
  },
});

export const goalsHeader = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  marginBottom: 8,
});

export const goalsTitle = style({
  fontFamily: vars.font.display,
  fontSize: 19,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  margin: 0,
  transition: themeTransition,
});

export const goalRow = style({
  padding: "12px 0",
  cursor: "pointer",
  selectors: {
    "&:not(:first-child)": {
      borderTop: `1px solid ${vars.rule}`,
    },
  },
});

export const goalHead = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

export const goalName = style({
  fontFamily: vars.font.display,
  fontSize: 16,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  flex: 1,
  color: vars.ink,
  transition: themeTransition,
});

export const goalFraction = style({
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  fontWeight: 700,
  color: vars.inkSoft,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const goalTrack = style({
  marginTop: 8,
  height: 6,
  borderRadius: 999,
  background: `color-mix(in srgb, ${vars.ink} 10%, transparent)`,
  position: "relative",
  overflow: "hidden",
});

export const goalFill = style({
  position: "absolute",
  inset: 0,
  borderRadius: 999,
});

export const goalFooter = style({
  marginTop: 7,
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 10,
});

export const goalNext = style({
  fontSize: 12,
  color: vars.inkSoft,
  fontFamily: vars.font.ui,
  fontWeight: 500,
  transition: themeTransition,
});

export const goalsEmpty = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 120,
  color: vars.muted,
});
