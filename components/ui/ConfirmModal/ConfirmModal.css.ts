import { style } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  backdropFilters,
  popover,
} from "@/lib/theme";

export const CONFIRM_FADE_MS = 180;

export const overlay = style({
  position: "fixed",
  inset: 0,
  zIndex: 100,
  background: vars.overlay,
  backdropFilter: backdropFilters.palette,
  WebkitBackdropFilter: backdropFilters.palette,
  opacity: 0,
  transition: `opacity ${CONFIRM_FADE_MS}ms ease`,
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
    zIndex: 101,
    top: "50%",
    left: "50%",
    padding: "18px 20px 20px",
    width: "min(440px, calc(100vw - 32px))",
    maxHeight: "calc(100vh - 64px)",
    overflow: "auto",
    transform: "translate(-50%, calc(-50% + 8px)) scale(0.985)",
    transition: `transform ${CONFIRM_FADE_MS}ms ease, ${themeTransition}`,
    selectors: {
      "&[data-state='open']": {
        transform: "translate(-50%, -50%) scale(1)",
      },
    },
  },
]);

export const modalTitle = style({
  fontFamily: vars.font.display,
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  margin: 0,
  transition: themeTransition,
});

export const modalBody = style({
  marginTop: space["2.5"],
  fontSize: 13,
  color: vars.inkSoft,
  fontFamily: vars.font.ui,
  lineHeight: 1.5,
  transition: themeTransition,
});

export const modalActions = style({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: space["2"],
  marginTop: space["6"],
  flexWrap: "wrap",
});
