import { style } from "@vanilla-extract/css";
import { space, vars, buttonTransition, backdropFilters, radii } from "@/lib/theme";

export const tabBar = style({
  position: "fixed",
  left: 12,
  right: 12,
  bottom: 12,
  zIndex: 5,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-around",
  padding: "8px 14px",
  background: vars.glass.bg,
  backdropFilter: backdropFilters.panel,
  WebkitBackdropFilter: backdropFilters.panel,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: radii.pill,
  boxShadow: vars.shadow.panelSm,
});

export const tab = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: space["0.5"],
  padding: "6px 8px",
  background: "transparent",
  border: "none",
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  textDecoration: "none",
  cursor: "pointer",
});

export const tabActive = style({
  color: vars.ink,
});

export const tabGlyph = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 22,
});

export const tabUnderline = style({
  width: 18,
  height: 2,
  borderRadius: 2,
  background: vars.ink,
  marginTop: space["0.5"],
});

export const captureTabWrapper = style({
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
});

export const captureButton = style({
  width: 54,
  height: 54,
  borderRadius: radii.pill,
  background: vars.ink,
  color: vars.paper,
  border: "none",
  cursor: "pointer",
  fontFamily: vars.font.ui,
  fontSize: 22,
  fontWeight: 600,
  display: "grid",
  placeItems: "center",
  marginTop: `-${space["7"]}`,
  boxShadow: `0 8px 24px ${vars.status.error}55, inset 0 1px 0 rgba(255,255,255,0.18)`,
  transition: buttonTransition,
  selectors: {
    "&:active": { transform: "scale(0.96)" },
  },
});
