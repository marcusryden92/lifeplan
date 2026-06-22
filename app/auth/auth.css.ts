import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

export const page = style({
  position: "relative",
  minHeight: "100vh",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: vars.bezel,
  color: vars.ink,
  transition: themeTransition,
});
