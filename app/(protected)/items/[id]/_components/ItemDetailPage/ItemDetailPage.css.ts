import { style, keyframes } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  interactiveTransition,
  media,
  radii,
  text,
  progressTrack as progressTrackRecipe,
} from "@/lib/theme";

const lockedShake = keyframes({
  "0%, 100%": { transform: "translateX(0)" },
  "20%, 60%": { transform: "translateX(-3px)" },
  "40%, 80%": { transform: "translateX(3px)" },
});


export const progressBlock = style({
  marginTop: space["10"],
  marginBottom: space["6"],
  height: 38,
  overflow: "hidden",
});

export const progressMeta = style([
  text.body,
  {
    lineHeight: 1,
    color: vars.inkSoft,
    fontVariantNumeric: "tabular-nums",
    transition: themeTransition,
  },
]);

export const progressMetaStrong = style({
  color: vars.ink,
  fontWeight: 600,
});

export const progressTrack = style([
  progressTrackRecipe({ size: "lg" }),
  {
    marginTop: space["2.5"],
    transition: themeTransition,
  },
]);

export const progressFill = style({
  position: "absolute",
  inset: 0,
  borderRadius: radii.pill,
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
  gap: space["2.5"],
  height: "100%",
  width: "calc(50% - 24px)",
  "@media": {
    [media.tablet]: { width: "100%" },
  },
});

export const completeLeftGroup = style({
  display: "flex",
  alignItems: "center",
  gap: space["2.5"],
});

export const completeCheckbox = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: radii.pill,
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

export const completeLabel = style([
  text.body,
  {
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: vars.muted,
    flexShrink: 0,
  },
]);

export const completeDateWrap = style({
  width: 250,
  maxWidth: "100%",
});

export const completeDateWrapFaded = style({
  opacity: 0.4,
  transition: "opacity 160ms ease",
});

export const overviewGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: space["12"],
  "@media": {
    [media.tablet]: { gridTemplateColumns: "1fr", gap: space["6"] },
  },
});

export const leftCol = style({
  display: "flex",
  flexDirection: "column",
  gap: space["4"],
  minWidth: 0,
});

export const rightCol = style({
  display: "flex",
  flexDirection: "column",
  gap: space["4"],
  minWidth: 0,
});
