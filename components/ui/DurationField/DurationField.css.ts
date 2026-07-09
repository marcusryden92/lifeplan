import { style } from "@vanilla-extract/css";
import { space, vars, themeTransition, caption } from "@/lib/theme";

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

// Narrow, centered, bold numeric field. The box (fill, border, radius, focus,
// spinner removal) comes from the boxed <Input> recipe; these override the
// geometry. Doubled selector to win specificity over the recipe class.
export const input = style({
  selectors: {
    "&&": {
      width: 58,
      padding: "6px 8px",
      fontWeight: 600,
      textAlign: "center",
      fontVariantNumeric: "tabular-nums",
    },
  },
});

export const unit = style([
  caption,
  {
    color: vars.muted,
    transition: themeTransition,
  },
]);
