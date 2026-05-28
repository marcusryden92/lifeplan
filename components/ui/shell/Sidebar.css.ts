import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/lib/theme";

export const sidebar = style({
  flexShrink: 0,
  borderRight: `1px solid ${vars.rule}`,
  background: vars.glass.bg,
  backdropFilter: "blur(28px) saturate(180%)",
  WebkitBackdropFilter: "blur(28px) saturate(180%)",
  padding: "20px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  position: "relative",
  zIndex: 2,
  transition: "width .18s ease",
});

export const sidebarWidth = styleVariants({
  expanded: { width: 208 },
  collapsed: { width: 60 },
});

export const brand = style({
  padding: "4px 10px 18px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontFamily: vars.font.display,
  fontSize: 19,
  fontWeight: 500,
  letterSpacing: "-0.03em",
  color: vars.ink,
  whiteSpace: "nowrap",
  overflow: "hidden",
});

export const brandCollapsed = style({
  padding: "4px 0 18px",
  justifyContent: "center",
});

export const navItem = style({
  height: 38,
  padding: "0 12px",
  display: "flex",
  alignItems: "center",
  gap: 12,
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
  transition: "background .15s ease, color .15s ease",
  flexShrink: 0,
  selectors: {
    "&:hover": {
      background: vars.glass.bgSoft,
      color: vars.ink,
    },
  },
});

export const navItemCollapsed = style({
  padding: 0,
  justifyContent: "center",
  gap: 0,
});

export const navItemActive = style({
  background: vars.glass.bgDeep,
  border: `1px solid ${vars.glass.stroke}`,
  color: vars.ink,
  fontWeight: 600,
  boxShadow: `inset 0 1px 0 ${vars.glass.hi}`,
});

export const navGlyph = style({
  width: 14,
  textAlign: "center",
  fontSize: 13,
  flexShrink: 0,
});

export const navLabel = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const spacer = style({ flex: 1 });

export const footerRow = style({
  padding: "12px 12px 4px",
  borderTop: `1px solid ${vars.rule}`,
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 8,
});

export const footerRowCollapsed = style({
  padding: "12px 0 4px",
  justifyContent: "center",
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
});

export const footerName = style({
  fontSize: 13,
  fontWeight: 600,
  color: vars.ink,
  fontFamily: vars.font.ui,
});

export const collapseChevron = style({
  position: "absolute",
  right: -10,
  top: 28,
  width: 20,
  height: 20,
  borderRadius: 999,
  background: vars.glass.bgDeep,
  border: `1px solid ${vars.glass.stroke}`,
  color: vars.inkSoft,
  display: "grid",
  placeItems: "center",
  fontSize: 11,
  cursor: "pointer",
  zIndex: 3,
  boxShadow: vars.shadow.panelSm,
  selectors: {
    "&:hover": { color: vars.ink },
  },
});
