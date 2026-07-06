import { style, keyframes } from "@vanilla-extract/css";
import {
  space,
  vars,
  DURATIONS,
  popover,
  backdropFilters,
  formInput,
  media,
} from "@/lib/theme";

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
    width: "min(520px, calc(100vw - 32px))",
    padding: "18px 20px 20px",
    display: "flex",
    flexDirection: "column",
    gap: space["4"],
    animationName: slideUp,
    animationDuration: `${DURATIONS.modal}s`,
    animationTimingFunction: "ease",
    "@media": {
      [media.mobile]: {
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
  gap: space["3"],
});

export const titleInput = style([formInput({ variant: "underline" })]);

export const field = style({
  display: "flex",
  flexDirection: "column",
  gap: space["2"],
});

export const fieldLabel = style({
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.01em",
  color: vars.muted,
});

export const durationRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
});

export const durationInput = style([
  formInput({ variant: "boxed" }),
  { width: 96 },
]);

export const durationUnit = style({
  fontSize: 13,
  color: vars.muted,
});

export const footer = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: space["3"],
  flexWrap: "wrap",
});
