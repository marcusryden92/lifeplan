import { style, styleVariants } from "@vanilla-extract/css";
import { space, vars, themeTransition, radii } from "@/lib/theme";

const rowBase = style({
  display: "flex",
  alignItems: "center",
  fontFamily: vars.font.ui,
  color: vars.ink,
  transition: themeTransition,
});

export const row = styleVariants({
  card: [rowBase, { gap: space["3"], padding: "6px 0", fontSize: 13 }],
  rail: [
    rowBase,
    { gap: space["1.5"], fontSize: 11.5, fontVariantNumeric: "tabular-nums" },
  ],
});

export const time = style({
  fontVariantNumeric: "tabular-nums",
  color: vars.inkSoft,
});

export const arrow = style({
  color: vars.muted,
});

export const skipped = style({
  color: vars.muted,
  fontStyle: "italic",
});

const restoreBase = style({
  marginLeft: "auto",
  display: "inline-flex",
  alignItems: "center",
  gap: space["1"],
  background: "transparent",
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontWeight: 600,
  cursor: "pointer",
  transition: themeTransition,
});

export const restore = styleVariants({
  card: [
    restoreBase,
    {
      border: `1px solid ${vars.glass.stroke}`,
      borderRadius: radii.pill,
      fontSize: 11,
      padding: "3px 10px",
      selectors: {
        "&:hover": {
          background: vars.interactive.hoverFill,
          color: vars.ink,
        },
      },
    },
  ],
  rail: [
    restoreBase,
    {
      border: "none",
      borderRadius: radii.sm,
      fontSize: 10.5,
      padding: "2px 4px",
      selectors: {
        "&:hover": {
          color: vars.ink,
          background: `color-mix(in srgb, ${vars.ink} 6%, transparent)`,
        },
      },
    },
  ],
});
