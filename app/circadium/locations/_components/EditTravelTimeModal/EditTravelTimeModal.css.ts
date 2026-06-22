import { style } from "@vanilla-extract/css";
import {
  vars,
  themeTransition,
  themeDark,
  popover,
  backdropFilters,
  interactiveTransition,
  formInput,
} from "@/lib/theme";

const FADE_MS = 160;

export const MODAL_FADE_MS = FADE_MS;

export const overlay = style({
  position: "fixed",
  inset: 0,
  background: vars.overlay,
  backdropFilter: backdropFilters.palette,
  WebkitBackdropFilter: backdropFilters.palette,
  zIndex: 150,
  opacity: 0,
  transition: `opacity ${FADE_MS}ms ease`,
  selectors: {
    "&[data-state='open']": {
      opacity: 1,
    },
  },
});

export const modal = style([
  popover({ size: "xl" }),
  {
    position: "fixed",
    zIndex: 151,
    top: "50%",
    left: "50%",
    width: "min(460px, calc(100vw - 32px))",
    maxHeight: "calc(100vh - 48px)",
    overflow: "auto",
    padding: "20px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    fontFamily: vars.font.ui,
    color: vars.ink,
    transform: "translate(-50%, calc(-50% + 8px)) scale(0.985)",
    transition: `transform ${FADE_MS}ms ease, ${themeTransition}`,
    selectors: {
      "&[data-state='open']": {
        transform: "translate(-50%, -50%) scale(1)",
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

// Numeric stepper for travel-minute fields. Inherits the boxed form-input
// look (bg, border, focus color) so it matches every other input, then
// overrides the bits specific to a compact right-aligned numeric cell.
export const periodInput = style([
  formInput({ variant: "boxed" }),
  {
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 13,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    textAlign: "right",
    selectors: {
      "&::-webkit-inner-spin-button": { appearance: "none", margin: 0 },
      "&::-webkit-outer-spin-button": { appearance: "none", margin: 0 },
      [`.${themeDark} &`]: { colorScheme: "dark" },
    },
  },
]);

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
