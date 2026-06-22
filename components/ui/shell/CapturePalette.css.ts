import { style, keyframes } from "@vanilla-extract/css";
import {
  vars,
  DURATIONS,
  popover,
  backdropFilters,
  formInput,
} from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const slideUp = keyframes({
  from: { opacity: 0, transform: "translateY(8px) scale(0.98)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

const sheetUp = keyframes({
  from: { transform: "translateY(100%)" },
  to: { transform: "translateY(0)" },
});

export const overlay = style({
  position: "fixed",
  inset: 0,
  background: vars.overlay,
  backdropFilter: backdropFilters.palette,
  WebkitBackdropFilter: backdropFilters.palette,
  zIndex: 50,
  animationName: fadeIn,
  animationDuration: `${DURATIONS.modal}s`,
  animationTimingFunction: "ease",
});

export const dialog = style([
  popover({ size: "xl" }),
  {
    position: "fixed",
    zIndex: 51,
    top: "20%",
    left: 0,
    right: 0,
    marginLeft: "auto",
    marginRight: "auto",
    width: "min(560px, calc(100vw - 32px))",
    padding: "18px 20px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    animationName: slideUp,
    animationDuration: `${DURATIONS.modal}s`,
    animationTimingFunction: "ease",
    "@media": {
      [MOBILE]: {
        top: "auto",
        bottom: 0,
        left: 0,
        right: 0,
        marginLeft: 0,
        marginRight: 0,
        width: "100%",
        borderRadius: "22px 22px 0 0",
        animationName: sheetUp,
        animationDuration: `${DURATIONS.modal}s`,
      },
    },
  },
]);

export const header = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
});

export const input = style([formInput({ variant: "underline" })]);

export const hintsRow = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
});

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
  borderRadius: 6,
  padding: "2px 6px",
});
