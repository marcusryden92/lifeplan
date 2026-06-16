import { style } from "@vanilla-extract/css";
import { vars, themeTransition, backdropFilters, popover } from "@/lib/theme";

export const FADE_MS = 180;

export const overlay = style({
  position: "fixed",
  inset: 0,
  zIndex: 100,
  background: vars.overlay,
  backdropFilter: backdropFilters.palette,
  WebkitBackdropFilter: backdropFilters.palette,
  opacity: 0,
  transition: `opacity ${FADE_MS}ms ease`,
  selectors: {
    "&[data-state='open']": {
      opacity: 1,
    },
  },
});

// Sibling of overlay (not a child) so backdrop-filter samples the original
// page content directly. Nesting inside overlay would mean the modal's
// backdrop-filter resamples the overlay's already-blurred output and ends up
// desaturated.
export const modal = style([
  popover({ size: "lg" }),
  {
    position: "fixed",
    zIndex: 101,
    top: "50%",
    left: "50%",
    padding: "22px 26px 20px",
    width: "min(440px, calc(100vw - 32px))",
    maxHeight: "calc(100vh - 64px)",
    overflow: "auto",
    transform: "translate(-50%, calc(-50% + 8px)) scale(0.985)",
    transition: `transform ${FADE_MS}ms ease, ${themeTransition}`,
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
