import { style } from "@vanilla-extract/css";
import { vars } from "@/lib/theme";

const TRANSITION = "0.2s ease";
const THEME =
  "background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, fill 0.2s ease, stroke 0.2s ease";

export const sidebar = style({
  flexShrink: 0,
  borderRight: `1px solid ${vars.rule}`,
  background: vars.glass.bg,
  backdropFilter: "blur(28px) saturate(180%)",
  WebkitBackdropFilter: "blur(28px) saturate(180%)",
  padding: "10px",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  position: "relative",
  zIndex: 2,
  width: 208,
  transition: `width ${TRANSITION}, ${THEME}`,
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
  transition: `max-width ${TRANSITION}, opacity ${TRANSITION}, ${THEME}`,
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
  transition: `background ${TRANSITION}, color ${TRANSITION}, border-color ${TRANSITION}, box-shadow ${TRANSITION}`,
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
  transition: `max-width ${TRANSITION}, opacity ${TRANSITION}, ${THEME}`,
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
  borderTop: `1px solid ${vars.rule}`,
  display: "flex",
  alignItems: "center",
  marginTop: 8,
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
  color: "#1a1827",
  flexShrink: 0,
  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.6)`,
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
  transition: `max-width ${TRANSITION}, opacity ${TRANSITION}, ${THEME}`,
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
  transition: `transform ${TRANSITION}`,
  selectors: {
    '[data-collapsed="true"] &': {
      transform: "rotate(180deg)",
    },
  },
});
