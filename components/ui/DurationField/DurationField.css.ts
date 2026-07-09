import { style } from "@vanilla-extract/css";
import { space, vars, themeTransition, radii, text, caption } from "@/lib/theme";

export const root = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space["3"],
});

export const unitGroup = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space["1.5"],
});

export const input = style([
  text.row,
  {
    width: 58,
    padding: "6px 8px",
    background: vars.glass.bgSoft,
    border: `1px solid ${vars.glass.stroke}`,
    borderRadius: radii["sm+2"],
    color: vars.ink,
    fontWeight: 600,
    textAlign: "center",
    outline: "none",
    fontVariantNumeric: "tabular-nums",
    transition: themeTransition,
    selectors: {
      "&:focus": { borderColor: vars.accent.primary },
      "&::-webkit-inner-spin-button": { appearance: "none", margin: 0 },
      "&::-webkit-outer-spin-button": { appearance: "none", margin: 0 },
    },
  },
]);

export const unit = style([
  caption,
  {
    color: vars.muted,
    transition: themeTransition,
  },
]);
