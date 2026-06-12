import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

export const drawer = style({
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: "16px 18px",
  borderLeft: `1px solid ${vars.rule}`,
  background: vars.glass.bgSoft,
  borderBottomRightRadius: 18,
  height: "100%",
  minHeight: 0,
  overflow: "auto",
  transition: themeTransition,
});

export const drawerHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const drawerHeaderLabel = style({
  letterSpacing: "0.14em",
});

export const drawerClose = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  borderRadius: 999,
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&:hover": { color: vars.ink, background: vars.glass.bgSoft },
  },
});

export const drawerBody = style({
  display: "flex",
  flexDirection: "column",
  gap: 14,
});

export const drawerTitleInput = style({
  fontFamily: vars.font.display,
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  background: "transparent",
  border: "none",
  outline: "none",
  padding: "4px 0",
  borderBottom: `1px solid ${vars.rule}`,
  transition: themeTransition,
  selectors: {
    "&:focus": { borderBottomColor: vars.accent.primary },
    "&::placeholder": { color: vars.muted },
  },
});

export const fieldStack = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
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

export const durationStepper = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
});

export const stepperBtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  border: `1px solid ${vars.glass.stroke}`,
  background: vars.glass.bg,
  borderRadius: 6,
  color: vars.ink,
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&:hover": { background: vars.glass.bgDeep },
  },
});

export const stepperValue = style({
  width: 72,
  padding: "5px 10px",
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: 8,
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  fontWeight: 600,
  color: vars.ink,
  textAlign: "center",
  outline: "none",
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
  selectors: {
    "&:focus": { borderColor: vars.accent.primary },
    "&::-webkit-inner-spin-button": { appearance: "none", margin: 0 },
    "&::-webkit-outer-spin-button": { appearance: "none", margin: 0 },
  },
});

export const dateInput = style({
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: 8,
  padding: "8px 12px",
  fontFamily: vars.font.ui,
  fontSize: 13,
  color: vars.ink,
  outline: "none",
  fontVariantNumeric: "tabular-nums",
  colorScheme: "light dark",
  transition: themeTransition,
  selectors: {
    "&:focus": { borderColor: vars.accent.primary },
  },
});

export const drawerFooter = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginTop: "auto",
  paddingTop: 16,
  borderTop: `1px solid ${vars.rule}`,
  transition: themeTransition,
});
