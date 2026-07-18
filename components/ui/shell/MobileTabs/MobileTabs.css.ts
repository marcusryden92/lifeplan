import { style } from "@vanilla-extract/css";
import { vars } from "@/lib/theme/tokens.css";
import { space, radii } from "@/lib/theme/scales";
import { fieldLabel, text } from "@/lib/theme/typography.css";
import { backdropFilters } from "@/lib/theme/effects";
import { buttonTransition, themeTransition } from "@/lib/theme/transitions";

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

// Always rendered so every tab reserves the same height; only the active tab
// paints it. Conditionally rendering it made the active tab taller, and the
// bar's alignItems:center then nudged its icon/label upward on select.
export const tabUnderline = style({
  width: 18,
  height: 2,
  borderRadius: 2,
  background: "transparent",
  marginTop: space["0.5"],
  transition: themeTransition,
});

export const tabUnderlineActive = style({
  background: vars.ink,
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

export const sheetItemActive = style({
  background: vars.interactive.selectedFill,
});

export const sheetDivider = style({
  height: 1,
  margin: `${space["2"]}px 0`,
  background: vars.rule,
  border: "none",
});
