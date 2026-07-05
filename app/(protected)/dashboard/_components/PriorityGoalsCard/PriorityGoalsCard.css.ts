import { style } from "@vanilla-extract/css";
import { space, vars, themeTransition, media, radii } from "@/lib/theme";


export const goalsCard = style({
  padding: "16px 20px",
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  "@media": {
    [media.mobile]: {
      flex: "0 0 auto",
      minHeight: "auto",
    },
  },
});

export const goalsHeader = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  marginBottom: space["2"],
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
  gap: space["2"],
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
  marginTop: space["2"],
  height: 6,
  borderRadius: radii.pill,
  background: `color-mix(in srgb, ${vars.ink} 10%, transparent)`,
  position: "relative",
  overflow: "hidden",
});

export const goalFill = style({
  position: "absolute",
  inset: 0,
  borderRadius: radii.pill,
});

export const goalFooter = style({
  marginTop: space["2"],
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: space["2.5"],
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
