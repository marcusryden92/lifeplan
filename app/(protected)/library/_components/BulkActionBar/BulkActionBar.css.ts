import { style } from "@vanilla-extract/css";
import { vars } from "@/lib/theme/tokens.css";
import { space, radii, media, zIndex } from "@/lib/theme/scales";
import { text } from "@/lib/theme/typography.css";
import { themeTransition } from "@/lib/theme/transitions";

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

export const countLabel = style([
  text.bodySm,
  {
    fontWeight: 600,
    whiteSpace: "nowrap",
    padding: "0 6px",
  },
]);

export const barDivider = style({
  width: 1,
  alignSelf: "stretch",
  margin: "4px 4px",
  background: `color-mix(in srgb, ${vars.paper} 25%, transparent)`,
});

// The bar surface is vars.ink, so the glass pillBtn's currentColor tinting
// must run off paper, not the recipe's default ink.
export const barBtn = style({
  color: vars.paper,
  whiteSpace: "nowrap",
});

export const escHint = style([
  text.label,
  {
    color: `color-mix(in srgb, ${vars.paper} 60%, transparent)`,
    whiteSpace: "nowrap",
    padding: "0 6px",
    "@media": {
      [media.mobile]: {
        display: "none",
      },
    },
  },
]);

export const menu = style({
  display: "flex",
  flexDirection: "column",
  gap: space["0.5"],
  maxHeight: 280,
  overflowY: "auto",
  minWidth: 190,
});

export const menuItem = style([
  text.body,
  {
    display: "flex",
    alignItems: "center",
    gap: space["2"],
    padding: "6px 8px",
    border: "none",
    borderRadius: radii["xs"],
    background: "transparent",
    color: vars.ink,
    textAlign: "left",
    cursor: "pointer",
    transition: themeTransition,
    selectors: {
      "&:hover": {
        background: vars.interactive.hoverFill,
      },
    },
  },
]);

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

export const priorityPill = style([
  text.bodySm,
  {
    width: 28,
    height: 28,
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${vars.rule}`,
    borderRadius: radii["pill"],
    background: "transparent",
    color: vars.ink,
    cursor: "pointer",
    transition: themeTransition,
    selectors: {
      "&:hover": {
        background: vars.interactive.hoverFill,
        borderColor: vars.inkSoft,
      },
    },
  },
]);
