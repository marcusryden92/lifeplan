import { style } from "@vanilla-extract/css";
import { space, vars, radii, media, zIndex, themeTransition } from "@/lib/theme";

export const bar = style({
  position: "fixed",
  bottom: 20,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: zIndex.floating,
  display: "flex",
  alignItems: "center",
  gap: space["1"],
  padding: "8px 12px",
  borderRadius: radii["pill"],
  background: vars.ink,
  color: vars.paper,
  boxShadow: vars.shadow.panel,
  fontFamily: vars.font.ui,
  transition: themeTransition,
  maxWidth: "calc(100vw - 24px)",
  "@media": {
    [media.mobile]: {
      bottom: 84,
      flexWrap: "wrap",
      justifyContent: "center",
      borderRadius: radii["xl"],
    },
  },
});

export const countLabel = style({
  fontSize: 12.5,
  fontWeight: 600,
  whiteSpace: "nowrap",
  padding: "0 6px",
});

export const barDivider = style({
  width: 1,
  alignSelf: "stretch",
  margin: "4px 4px",
  background: `color-mix(in srgb, ${vars.paper} 25%, transparent)`,
});

export const barBtn = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space["1.5"],
  padding: "6px 10px",
  border: "none",
  borderRadius: radii["pill"],
  background: "transparent",
  color: vars.paper,
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${vars.paper} 14%, transparent)`,
    },
  },
});

export const barBtnDanger = style({
  color: vars.status.error,
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${vars.status.error} 18%, transparent)`,
    },
  },
});

export const escHint = style({
  fontSize: 11.5,
  color: `color-mix(in srgb, ${vars.paper} 60%, transparent)`,
  whiteSpace: "nowrap",
  padding: "0 6px",
  "@media": {
    [media.mobile]: {
      display: "none",
    },
  },
});

export const menu = style({
  display: "flex",
  flexDirection: "column",
  gap: space["0.5"],
  maxHeight: 280,
  overflowY: "auto",
  minWidth: 190,
});

export const menuItem = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  padding: "6px 8px",
  border: "none",
  borderRadius: radii["xs"],
  background: "transparent",
  color: vars.ink,
  fontFamily: vars.font.ui,
  fontSize: 13,
  textAlign: "left",
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.interactive.hoverFill,
    },
  },
});

export const menuItemMuted = style({
  color: vars.muted,
});

export const swatchGroup = style({
  display: "flex",
  gap: space["1"],
  marginBottom: space["1"],
});

export const swatch = style({
  width: 18,
  height: 18,
  padding: 0,
  border: `1px solid ${vars.rule}`,
  borderRadius: radii["xs"],
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&:hover": {
      transform: "scale(1.15)",
    },
  },
});

export const priorityRow = style({
  display: "flex",
  gap: space["1"],
});

export const priorityPill = style({
  width: 26,
  height: 26,
  padding: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: `1px solid ${vars.rule}`,
  borderRadius: radii["pill"],
  background: "transparent",
  color: vars.ink,
  fontFamily: vars.font.ui,
  fontSize: 12,
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.interactive.hoverFill,
      borderColor: vars.inkSoft,
    },
  },
});
