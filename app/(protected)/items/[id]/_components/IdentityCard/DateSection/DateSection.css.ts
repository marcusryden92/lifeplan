import { style } from "@vanilla-extract/css";
import { vars, themeTransition, themeDark, radii } from "@/lib/theme";

export const fieldStack = style({
  display: "flex",
  flexDirection: "column",
  gap: 7,
  minWidth: 0,
});

export const fieldLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
  transition: themeTransition,
});

export const dateInput = style({
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: radii["sm+2"],
  padding: "8px 36px 8px 12px",
  fontFamily: vars.font.ui,
  fontSize: 13,
  color: vars.ink,
  outline: "none",
  fontVariantNumeric: "tabular-nums",
  width: "100%",
  // colorScheme drives the browser-rendered datetime picker icon. Tie it to
  // our theme so the icon contrasts with the input background instead of
  // following the OS preference.
  colorScheme: "light",
  transition: themeTransition,
  selectors: {
    "&:focus": {
      borderColor: vars.accent.primary,
    },
    [`.${themeDark} &`]: {
      colorScheme: "dark",
    },
  },
});

export const dateInputWrap = style({
  position: "relative",
  display: "block",
});

export const dateClearBtn = style({
  position: "absolute",
  top: "50%",
  right: 6,
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: radii.pill,
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  padding: 0,
  transition: themeTransition,
  selectors: {
    "&:hover": {
      color: vars.ink,
      background: vars.interactive.hoverFill,
    },
    "&:focus-visible": {
      outline: `1px solid ${vars.accent.primary}`,
    },
  },
});
