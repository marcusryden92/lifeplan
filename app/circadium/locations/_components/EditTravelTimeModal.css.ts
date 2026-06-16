import { style, keyframes } from "@vanilla-extract/css";
import {
  vars,
  themeTransition,
  lumenDark,
  popover,
  backdropFilters,
  interactiveTransition,
} from "@/lib/theme";

const FADE_MS = 160;

export const MODAL_FADE_MS = FADE_MS;

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const liftIn = keyframes({
  from: { opacity: 0, transform: "translateY(8px) scale(0.985)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

export const overlay = style({
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: vars.overlay,
  backdropFilter: backdropFilters.modal,
  WebkitBackdropFilter: backdropFilters.modal,
  zIndex: 150,
  opacity: 0,
  transition: `opacity ${FADE_MS}ms ease`,
  selectors: {
    "&[data-state='open']": {
      opacity: 1,
      animation: `${fadeIn} ${FADE_MS}ms ease`,
    },
  },
});

export const modal = style([
  popover({ size: "lg" }),
  {
    width: "100%",
    maxWidth: 460,
    padding: "20px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    fontFamily: vars.font.ui,
    color: vars.ink,
    opacity: 0,
    transform: "translateY(8px) scale(0.985)",
    transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
    selectors: {
      [`${overlay}[data-state='open'] &`]: {
        opacity: 1,
        transform: "translateY(0) scale(1)",
        animation: `${liftIn} ${FADE_MS}ms ease`,
      },
    },
  },
]);

export const header = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

export const title = style({
  fontFamily: vars.font.display,
  fontSize: 20,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  margin: 0,
});

export const subtitle = style({
  fontSize: 12,
  color: vars.muted,
  fontVariantNumeric: "tabular-nums",
});

export const periodList = style({
  display: "flex",
  flexDirection: "column",
  gap: 10,
});

export const periodRow = style({
  display: "grid",
  gridTemplateColumns: "70px 1fr auto auto",
  alignItems: "center",
  gap: 8,
});

export const periodName = style({
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
  fontWeight: 600,
});

export const periodInput = style({
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: 8,
  padding: "6px 10px",
  fontFamily: vars.font.ui,
  fontSize: 13,
  fontWeight: 600,
  color: vars.ink,
  fontVariantNumeric: "tabular-nums",
  outline: "none",
  width: "100%",
  textAlign: "right",
  transition: themeTransition,
  selectors: {
    "&:focus": { borderColor: vars.accent.primary },
    "&::-webkit-inner-spin-button": { appearance: "none", margin: 0 },
    "&::-webkit-outer-spin-button": { appearance: "none", margin: 0 },
    [`.${lumenDark} &`]: { colorScheme: "dark" },
  },
});

export const googleHint = style({
  fontSize: 10.5,
  color: vars.muted,
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
});

export const revertBtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  borderRadius: 5,
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  padding: 0,
  transition: interactiveTransition("color", "background-color", "opacity"),
  selectors: {
    "&:hover": { color: vars.ink, background: vars.glass.bgSoft },
    "&:disabled": { opacity: 0.25, cursor: "default" },
  },
});

export const footer = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 6,
  justifyContent: "flex-end",
});

export const footerSpacer = style({ flex: 1 });
