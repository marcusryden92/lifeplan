import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

// Paper card — replaces the previous glass treatment so the auth surface
// matches the landing page's clean paper aesthetic.
export const card = style({
  width: "min(420px, calc(100vw - 32px))",
  padding: "28px 28px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  color: vars.ink,
  fontFamily: vars.font.ui,
  position: "relative",
  background: vars.paper,
  border: `1px solid ${vars.rule}`,
  borderRadius: 14,
  boxShadow:
    "0 1px 0 rgba(255,255,255,0.6) inset, 0 18px 40px rgba(22,20,42,0.08), 0 4px 12px rgba(22,20,42,0.04)",
});

export const brandRow = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
});

export const brand = style({
  fontFamily: vars.font.display,
  fontSize: 28,
  fontWeight: 500,
  letterSpacing: "-0.03em",
  lineHeight: 1,
  color: vars.ink,
  margin: 0,
});

export const title = style({
  fontFamily: vars.font.display,
  fontSize: 18,
  fontWeight: 500,
  letterSpacing: "-0.015em",
  lineHeight: 1.15,
  color: vars.inkSoft,
  margin: 0,
});

export const subtitle = style({
  fontSize: 12,
  color: vars.muted,
  letterSpacing: "0.01em",
});

export const body = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const divider = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  margin: "4px 0",
});

export const dividerLine = style({
  flex: 1,
  height: 1,
  background: vars.rule,
  transition: themeTransition,
});

export const dividerLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
});

export const altRow = style({
  textAlign: "center",
  fontSize: 12,
  color: vars.muted,
  marginTop: 2,
});

export const altLink = style({
  marginLeft: 6,
  color: vars.ink,
  fontWeight: 600,
  textDecoration: "none",
  transition: themeTransition,
  selectors: {
    "&:hover": { color: vars.accent.primary },
  },
});
