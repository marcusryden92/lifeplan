import { style } from "@vanilla-extract/css";
import { vars, themeTransition, radii } from "@/lib/theme";

export const kbd = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 18,
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  fontWeight: 600,
  color: vars.inkSoft,
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.rule}`,
  borderRadius: radii.xs,
  padding: "2px 6px",
  transition: themeTransition,
});
