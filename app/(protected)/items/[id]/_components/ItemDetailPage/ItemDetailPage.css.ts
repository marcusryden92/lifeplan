import { style, keyframes } from "@vanilla-extract/css";
import {
  vars,
  themeTransition,
  themeDark,
  interactiveTransition,
  media,
} from "@/lib/theme";

const lockedShake = keyframes({
  "0%, 100%": { transform: "translateX(0)" },
  "20%, 60%": { transform: "translateX(-3px)" },
  "40%, 80%": { transform: "translateX(3px)" },
});


export const progressBlock = style({
  marginTop: 36,
  marginBottom: 22,
  height: 38,
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

// Task completion row â€” sized to match the left column of overviewGrid (50%
// minus half the 48px gap) so the checkbox lines up with IdentityCard's left
// edge. justify-content puts the checkbox+label cluster on the left and the
// date picker on the right edge of that span. Drops to full width on mobile
// to match overviewGrid's 1-column layout.
export const completeRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  height: "100%",
  width: "calc(50% - 24px)",
  "@media": {
    [media.mobile]: { width: "100%" },
  },
});

export const completeLeftGroup = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
});

export const completeCheckbox = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: 999,
  border: `1.5px solid ${vars.muted}`,
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
  transition: interactiveTransition(
    "background-color",
    "border-color",
    "color",
  ),
  selectors: {
    "&[data-completed='true']": {
      background: vars.status.success,
      borderColor: vars.status.success,
      color: vars.paper,
    },
    "&:hover": { borderColor: vars.ink },
    "&[data-completed='true']:hover": {
      borderColor: vars.status.success,
      filter: "brightness(0.95)",
    },
    "&[data-locked='true']": { cursor: "not-allowed" },
    "&[data-shake='true']": {
      animation: `${lockedShake} 0.4s ease-in-out`,
      borderColor: vars.status.error,
      color: vars.status.error,
      background: "transparent",
    },
  },
});

export const completeLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: vars.muted,
  flexShrink: 0,
});

export const completeDateInput = style({
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: 8,
  padding: "0 32px 0 12px",
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  color: vars.ink,
  outline: "none",
  fontVariantNumeric: "tabular-nums",
  colorScheme: "light",
  height: 34,
  boxSizing: "border-box",
  transition: themeTransition,
  selectors: {
    "&:focus": { borderColor: vars.accent.primary },
    [`.${themeDark} &`]: { colorScheme: "dark" },
  },
});

export const completeDateInputFaded = style({
  opacity: 0.4,
  transition: "opacity 160ms ease",
});

export const overviewGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 48,
  "@media": {
    [media.mobile]: { gridTemplateColumns: "1fr", gap: 24 },
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
