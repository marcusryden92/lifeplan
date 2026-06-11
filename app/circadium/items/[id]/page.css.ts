import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

export const progressBlock = style({
  marginBottom: 22,
});

export const progressHeadRow = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
});

export const progressPercent = style({
  display: "flex",
  alignItems: "baseline",
  gap: 14,
});

export const progressNum = style({
  display: "flex",
  alignItems: "baseline",
  fontFamily: vars.font.display,
  fontSize: 44,
  fontWeight: 500,
  letterSpacing: "-0.045em",
  lineHeight: 1,
  gap: 14,
  color: vars.ink,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const progressNumPct = style({
  fontSize: 24,
  opacity: 0.55,
});

export const progressMeta = style({
  fontSize: 13,
  color: vars.inkSoft,
  fontFamily: vars.font.ui,
  fontWeight: 500,
  transition: themeTransition,
});

export const progressDeadline = style({
  fontSize: 13,
  color: vars.inkSoft,
  fontFamily: vars.font.ui,
  fontWeight: 500,
  transition: themeTransition,
});

export const progressTrack = style({
  marginTop: 14,
  height: 8,
  borderRadius: 999,
  background: vars.rule,
  position: "relative",
  overflow: "hidden",
  transition: themeTransition,
});

export const progressFill = style({
  position: "absolute",
  inset: 0,
  borderRadius: 999,
});

export const progressTick = style({
  position: "absolute",
  top: 0,
  bottom: 0,
  width: 1,
  background: vars.paper,
  opacity: 0.8,
});

export const overviewGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 18,
  "@media": {
    [MOBILE]: { gridTemplateColumns: "1fr", gap: 14 },
  },
});

export const leftCol = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});

export const rightCol = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
