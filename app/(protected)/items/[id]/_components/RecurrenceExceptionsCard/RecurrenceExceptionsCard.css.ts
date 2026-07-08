import { style } from "@vanilla-extract/css";
import { space, vars, themeTransition, display } from "@/lib/theme";

// borderTop, not borderBottom: the IdentityCard body above draws no bottom rule.
export const card = style({
  padding: "12px 0",
  borderTop: `1px solid ${vars.rule}`,
  transition: themeTransition,
});

export const cardTitle = style([
  display.listTitle,
  {
    color: vars.ink,
    marginBottom: space["3"],
    transition: themeTransition,
  },
]);
