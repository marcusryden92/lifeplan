import { style } from "@vanilla-extract/css";
import { vars } from "@/lib/theme";

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
  backdropFilter: "blur(28px) saturate(180%)",
  WebkitBackdropFilter: "blur(28px) saturate(180%)",
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: 999,
  boxShadow: vars.shadow.panelSm,
});

export const tab = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
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
  marginTop: 2,
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
  borderRadius: 999,
  background: vars.ink,
  color: vars.paper,
  border: "none",
  cursor: "pointer",
  fontFamily: vars.font.ui,
  fontSize: 22,
  fontWeight: 600,
  display: "grid",
  placeItems: "center",
  marginTop: -28,
  boxShadow: `0 8px 24px ${vars.status.error}55, inset 0 1px 0 rgba(255,255,255,0.18)`,
  transition:
    "transform .12s ease, background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
  selectors: {
    "&:active": { transform: "scale(0.96)" },
  },
});
