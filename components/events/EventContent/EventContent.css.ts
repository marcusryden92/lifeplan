import { style } from "@vanilla-extract/css";
import { space } from "@/lib/theme/scales";
import { iconBtn } from "@/lib/theme/recipes.css";

export const hoverActions = style({
  display: "flex",
  width: "100%",
  justifyContent: "space-between",
  alignItems: "center",
});

export const actionGroup = style({
  display: "flex",
  gap: space["2"],
});

// Tile text color tracks the event color, so the recipe's ink colors are
// overridden back to inherit.
export const iconButton = style([
  iconBtn({ size: "sm" }),
  {
    selectors: {
      "&&": { color: "inherit" },
      "&&:hover:not(:disabled)": { color: "inherit" },
    },
  },
]);
