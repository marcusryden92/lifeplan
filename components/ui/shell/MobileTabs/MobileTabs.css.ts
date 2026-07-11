import { style, keyframes } from "@vanilla-extract/css";
import {
  space,
  vars,
  buttonTransition,
  themeTransition,
  backdropFilters,
  radii,
  fieldLabel,
  text,
  popover,
  zIndex,
  DURATIONS,
} from "@/lib/theme";

export const tabBar = style({
  position: "fixed",
  left: 12,
  right: 12,
  bottom: 12,
  zIndex: 5,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-around",
  padding: "8px 14px",
  background: vars.glass.bg,
  backdropFilter: backdropFilters.panel,
  WebkitBackdropFilter: backdropFilters.panel,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: radii.pill,
  boxShadow: vars.shadow.panelSm,
});

export const tab = style([
  fieldLabel,
  {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space["0.5"],
    padding: "6px 8px",
    background: "transparent",
    border: "none",
    letterSpacing: "0.04em",
    textDecoration: "none",
    cursor: "pointer",
    // fieldLabel is `muted` — too faint for a primary nav. Lift the resting
    // state to inkSoft; active tabs go full ink + underline below.
    color: vars.inkSoft,
    transition: themeTransition,
  },
]);

export const tabActive = style({
  color: vars.ink,
});

export const tabGlyph = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 22,
});

export const tabUnderline = style({
  width: 18,
  height: 2,
  borderRadius: 2,
  background: vars.ink,
  marginTop: space["0.5"],
});

export const captureTabWrapper = style({
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
});

export const captureButton = style({
  width: 54,
  height: 54,
  borderRadius: radii.pill,
  background: vars.ink,
  color: vars.paper,
  border: "none",
  cursor: "pointer",
  fontFamily: vars.font.ui,
  fontSize: 22,
  fontWeight: 600,
  display: "grid",
  placeItems: "center",
  marginTop: `-${space["7"]}`,
  boxShadow: `0 8px 24px color-mix(in srgb, ${vars.status.error} 33%, transparent), inset 0 1px 0 rgba(255,255,255,0.18)`,
  transition: buttonTransition,
  selectors: {
    "&:active": { transform: "scale(0.96)" },
  },
});

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const sheetUp = keyframes({
  from: { transform: "translateY(100%)" },
  to: { transform: "translateY(0)" },
});

export const sheetOverlay = style({
  position: "fixed",
  inset: 0,
  background: vars.overlay,
  backdropFilter: backdropFilters.palette,
  WebkitBackdropFilter: backdropFilters.palette,
  zIndex: zIndex.palette,
  animationName: fadeIn,
  animationDuration: `${DURATIONS.modal}s`,
  animationTimingFunction: "ease",
});

export const sheet = style([
  popover({ size: "xl" }),
  {
    position: "fixed",
    zIndex: zIndex.palette + 1,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    flexDirection: "column",
    gap: space["0.5"],
    padding: `${space["2"]}px ${space["3"]}px calc(${space["4"]}px + env(safe-area-inset-bottom, 0px))`,
    borderRadius: `${radii["xl+2"]}px ${radii["xl+2"]}px 0 0`,
    animationName: sheetUp,
    animationDuration: `${DURATIONS.modal}s`,
    animationTimingFunction: "ease",
  },
]);

export const sheetHandle = style({
  alignSelf: "center",
  width: 36,
  height: 4,
  borderRadius: radii.pill,
  background: vars.rule,
  margin: `${space["1"]}px 0 ${space["2"]}px`,
});

export const sheetTitle = style([
  fieldLabel,
  {
    color: vars.muted,
    padding: `0 ${space["2"]}px ${space["1"]}px`,
  },
]);

export const sheetItem = style([
  text.body,
  {
    display: "flex",
    alignItems: "center",
    gap: space["3"],
    width: "100%",
    minHeight: 48,
    padding: `0 ${space["2"]}px`,
    background: "transparent",
    border: "none",
    borderRadius: radii.md,
    color: vars.ink,
    fontWeight: 500,
    textAlign: "left",
    textDecoration: "none",
    cursor: "pointer",
    transition: themeTransition,
    selectors: {
      "&:active": { background: vars.interactive.selectedFill },
    },
  },
]);

export const sheetItemDanger = style({
  color: vars.status.error,
});

export const sheetItemIcon = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: vars.inkSoft,
  selectors: {
    [`${sheetItemDanger} &`]: { color: vars.status.error },
  },
});
