import { style, keyframes } from "@vanilla-extract/css";
import {
  vars,
  themeTransition,
  themeDark,
  interactiveTransition,
} from "@/lib/theme";

const lockedShake = keyframes({
  "0%, 100%": { transform: "translateX(0)" },
  "20%, 60%": { transform: "translateX(-3px)" },
  "40%, 80%": { transform: "translateX(3px)" },
});

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
  padding: "8px 36px 8px 12px",
  fontFamily: vars.font.ui,
  fontSize: 13,
  color: vars.ink,
  outline: "none",
  fontVariantNumeric: "tabular-nums",
  width: "100%",
  colorScheme: "light",
  transition: themeTransition,
  selectors: {
    "&:focus": { borderColor: vars.accent.primary },
    [`.${themeDark} &`]: { colorScheme: "dark" },
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
  borderRadius: 999,
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  padding: 0,
  transition: themeTransition,
  selectors: {
    "&:hover": {
      color: vars.ink,
      background: vars.glass.bgSoft,
    },
    "&:focus-visible": {
      outline: `1px solid ${vars.accent.primary}`,
    },
  },
});

export const completeHeader = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

export const completeCheckbox = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 16,
  height: 16,
  borderRadius: 999,
  border: `1.5px solid ${vars.muted}`,
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  padding: 0,
  // Snappier than the 1s themeTransition so click feedback feels immediate.
  transition: interactiveTransition("background-color", "border-color", "color"),
  selectors: {
    "&[data-completed='true']": {
      background: vars.status.success,
      borderColor: vars.status.success,
      color: vars.paper,
    },
    "&:hover": {
      borderColor: vars.ink,
    },
    "&[data-completed='true']:hover": {
      borderColor: vars.status.success,
      filter: "brightness(0.95)",
    },
    "&[data-locked='true']": { cursor: "not-allowed" },
    "&[data-shake='true']": {
      animation: `${lockedShake} 0.4s ease-in-out`,
      borderColor: vars.status.error,
      color: vars.status.error,
      background: "transparent",
    },
  },
});

export const dateInputFaded = style({
  opacity: 0.4,
  transition: "opacity 160ms ease",
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
