import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

export const CONFIRM_FADE_MS = 180;

export const overlay = style({
  position: "fixed",
  inset: 0,
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.32)",
  backdropFilter: "blur(2px)",
  WebkitBackdropFilter: "blur(2px)",
  opacity: 0,
  transition: `opacity ${CONFIRM_FADE_MS}ms ease`,
  selectors: {
    "&[data-state='open']": {
      opacity: 1,
    },
  },
});

export const modal = style({
  background: vars.paper,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: 20,
  boxShadow: vars.shadow.panel,
  padding: "22px 26px 20px",
  width: "min(440px, calc(100vw - 32px))",
  maxHeight: "calc(100vh - 64px)",
  overflow: "auto",
  transform: "translateY(8px) scale(0.985)",
  transition: `transform ${CONFIRM_FADE_MS}ms ease, ${themeTransition}`,
  selectors: {
    "&[data-state='open']": {
      transform: "translateY(0) scale(1)",
    },
  },
});

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
  marginTop: 10,
  fontSize: 13.5,
  color: vars.inkSoft,
  fontFamily: vars.font.ui,
  lineHeight: 1.5,
  transition: themeTransition,
});

export const modalActions = style({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 8,
  marginTop: 22,
  flexWrap: "wrap",
});
