import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

export const progressBlock = style({
  marginTop: 36,
  marginBottom: 22,
  // Locks the block to the exact visible-state height so switching item type
  // or going to a goal with 0 subtasks doesn't shift the cards below.
  height: 32,
  overflow: "hidden",
});

export const progressMeta = style({
  fontSize: 13,
  lineHeight: 1,
  color: vars.inkSoft,
  fontFamily: vars.font.ui,
  fontWeight: 500,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const progressMetaStrong = style({
  color: vars.ink,
  fontWeight: 600,
});

export const progressTrack = style({
  marginTop: 9,
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
  gap: 48,
  "@media": {
    [MOBILE]: { gridTemplateColumns: "1fr", gap: 24 },
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
