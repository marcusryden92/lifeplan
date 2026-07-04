import { style } from "@vanilla-extract/css";
import { vars, themeTransition, radii } from "@/lib/theme";

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

export const fieldValue = style({
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  fontWeight: 600,
  color: vars.ink,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const numberInput = style({
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: radii["sm+2"],
  padding: "8px 12px",
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  color: vars.ink,
  outline: "none",
  width: "100%",
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
  selectors: {
    "&:focus": {
      borderColor: vars.accent.primary,
    },
  },
});
