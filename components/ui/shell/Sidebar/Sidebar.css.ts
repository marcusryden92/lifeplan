import { style } from "@vanilla-extract/css";
import {
  vars,
  collapseTransition,
  buttonTransition,
  DURATIONS,
  popover,
  backdropFilters,
} from "@/lib/theme";

export const sidebar = style({
  flexShrink: 0,
  borderRight: `1px solid ${vars.rule}`,
  background: vars.glass.bg,
  backdropFilter: backdropFilters.panel,
  WebkitBackdropFilter: backdropFilters.panel,
  padding: "10px",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  position: "relative",
  zIndex: 2,
  width: 208,
  transition: collapseTransition,
  selectors: {
    '&[data-collapsed="true"]': {
      width: 60,
    },
  },
});

export const brand = style({
  padding: "4px 5px 18px",
  display: "flex",
  alignItems: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
});

export const brandLogo = style({
  width: 30,
  height: 30,
  borderRadius: 999,
  background: vars.ink,
  flexShrink: 0,
});

export const brandText = style({
  fontFamily: vars.font.display,
  fontSize: 19,
  fontWeight: 500,
  letterSpacing: "-0.03em",
  color: vars.ink,
  flex: 1,
  minWidth: 0,
  maxWidth: "100%",
  paddingLeft: 12,
  boxSizing: "border-box",
  overflow: "hidden",
  transition: collapseTransition,
  selectors: {
    '[data-collapsed="true"] &': {
      maxWidth: 0,
      opacity: 0,
    },
  },
});

export const navItem = style({
  height: 38,
  padding: "0 4px",
  display: "flex",
  alignItems: "center",
  borderRadius: 999,
  textAlign: "left",
  background: "transparent",
  border: "1px solid transparent",
  color: vars.inkSoft,
  fontSize: 13.5,
  fontWeight: 500,
  fontFamily: vars.font.ui,
  cursor: "pointer",
  whiteSpace: "nowrap",
  textDecoration: "none",
  flexShrink: 0,
  transition: buttonTransition,
  selectors: {
    "&:hover": {
      background: vars.glass.bgSoft,
      color: vars.ink,
    },
  },
});

export const navItemActive = style({
  background: vars.glass.bgDeep,
  border: `1px solid ${vars.glass.stroke}`,
  color: vars.ink,
  fontWeight: 600,
  boxShadow: `inset 0 1px 0 ${vars.glass.hi}`,
});

export const navGlyph = style({
  width: 30,
  height: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
  lineHeight: 1,
  flexShrink: 0,
});

export const navLabel = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  flex: 1,
  minWidth: 0,
  maxWidth: "100%",
  paddingLeft: 12,
  boxSizing: "border-box",
  transition: collapseTransition,
  selectors: {
    '[data-collapsed="true"] &': {
      maxWidth: 0,
      opacity: 0,
    },
  },
});

export const spacer = style({ flex: 1 });

export const footerRow = style({
  padding: "12px 5px 4px",
  // Reset button borders explicitly per side so the top divider survives — a
  // shorthand `border: "none"` would clobber the borderTop set below.
  borderRight: "none",
  borderBottom: "none",
  borderLeft: "none",
  borderTop: `1px solid ${vars.rule}`,
  display: "flex",
  alignItems: "center",
  marginTop: 8,
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  width: "100%",
  textAlign: "left",
  transition: buttonTransition,
});

export const userMenu = style([
  popover({ size: "md" }),
  {
    // Mounted on document.body via createPortal so the sidebar's own
    // backdrop-filter can't trap the blur in a child stacking context.
    // top/left are set inline from the trigger's viewport rect; the transform
    // shifts the menu up by its own height minus 20px so the bottom edge dips
    // 20px into the footer button, giving the diagonal overlap effect.
    position: "fixed",
    transform: "translateY(calc(-100% + 20px))",
    width: 200,
    display: "flex",
    flexDirection: "column",
    padding: 6,
    zIndex: 100,
  },
]);

export const userMenuItem = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: vars.ink,
  fontFamily: vars.font.ui,
  fontSize: 13,
  fontWeight: 500,
  textAlign: "left",
  cursor: "pointer",
  textDecoration: "none",
  transition: buttonTransition,
  selectors: {
    "&:hover": { background: vars.glass.bgSoft },
  },
});

export const userMenuItemDanger = style({
  color: vars.status.error,
});

export const userMenuIcon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 14,
  flexShrink: 0,
});

export const avatar = style({
  width: 30,
  height: 30,
  borderRadius: 999,
  background: `linear-gradient(135deg, ${vars.accent.secondary}, ${vars.accent.primary})`,
  display: "grid",
  placeItems: "center",
  fontSize: 13,
  fontWeight: 700,
  color: vars.ink,
  flexShrink: 0,
  boxShadow: `inset 0 1px 0 ${vars.glass.hi}`,
});

export const footerText = style({
  lineHeight: 1.1,
  overflow: "hidden",
  whiteSpace: "nowrap",
  flex: 1,
  minWidth: 0,
  maxWidth: "100%",
  paddingLeft: 12,
  boxSizing: "border-box",
  transition: collapseTransition,
  selectors: {
    '[data-collapsed="true"] &': {
      maxWidth: 0,
      opacity: 0,
    },
  },
});

export const footerName = style({
  fontSize: 13,
  fontWeight: 600,
  color: vars.ink,
  fontFamily: vars.font.ui,
});

export const collapseChevronIcon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
  transition: `transform ${DURATIONS.collapse}s ease`,
  selectors: {
    '[data-collapsed="true"] &': {
      transform: "rotate(180deg)",
    },
  },
});
