import { style } from "@vanilla-extract/css";
import { vars, themeTransition, backdropFilters } from "@/lib/theme";

export const FADE_MS = 180;

export const overlay = style({
  position: "fixed",
  inset: 0,
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.32)",
  backdropFilter: backdropFilters.confirm,
  WebkitBackdropFilter: backdropFilters.confirm,
  opacity: 0,
  transition: `opacity ${FADE_MS}ms ease`,
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
  transition: `transform ${FADE_MS}ms ease, ${themeTransition}`,
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

export const timeRange = style({
  marginTop: 6,
  fontSize: 12.5,
  fontFamily: vars.font.ui,
  color: vars.muted,
  fontVariantNumeric: "tabular-nums",
});

export const titleInput = style({
  display: "block",
  width: "100%",
  marginTop: 16,
  padding: "10px 12px",
  fontFamily: vars.font.ui,
  fontSize: 14,
  fontWeight: 500,
  color: vars.ink,
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: 10,
  outline: "none",
  boxSizing: "border-box",
});

export const modalActions = style({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 8,
  marginTop: 22,
  flexWrap: "wrap",
});
