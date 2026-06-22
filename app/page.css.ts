import { style } from "@vanilla-extract/css";
import { vars, themeTransition, glass } from "@/lib/theme";

export const page = style({
  position: "relative",
  minHeight: "100vh",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: vars.bezel,
  color: vars.ink,
  transition: themeTransition,
});

export const card = style([
  glass({ radius: "xl", shadow: "panel", fill: "deep" }),
  {
    position: "relative",
    width: "min(720px, calc(100vw - 32px))",
    padding: "56px 48px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 8,
  },
]);

export const brand = style({
  fontFamily: vars.font.display,
  fontSize: "clamp(56px, 9vw, 96px)",
  fontWeight: 500,
  letterSpacing: "-0.04em",
  lineHeight: 1,
  margin: 0,
  color: vars.ink,
});

export const brandDot = style({
  display: "inline-block",
  width: 10,
  height: 10,
  borderRadius: 999,
  background: vars.accent.primary,
  marginLeft: 4,
  verticalAlign: "top",
  marginTop: "0.18em",
});

export const subtitle = style({
  fontFamily: vars.font.ui,
  fontSize: 18,
  color: vars.inkSoft,
  marginTop: 12,
  marginBottom: 12,
});

export const ctaRow = style({
  display: "flex",
  justifyContent: "center",
  marginTop: 16,
  marginBottom: 40,
});

export const featuresGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 14,
  width: "100%",
  textAlign: "left",
  "@media": {
    "screen and (min-width: 720px)": {
      gridTemplateColumns: "repeat(3, 1fr)",
    },
  },
});

export const featureCard = style({
  padding: "18px 18px 20px",
  borderRadius: 14,
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  transition: themeTransition,
  cursor: "default",
  selectors: {
    "&:hover": {
      background: vars.glass.bg,
      borderColor: vars.rule,
    },
  },
});

export const featureHead = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 8,
});

export const featureGlyph = style({
  fontFamily: vars.font.display,
  fontSize: 22,
  color: vars.accent.primary,
  lineHeight: 1,
});

export const featureTitle = style({
  fontFamily: vars.font.display,
  fontSize: 16,
  fontWeight: 500,
  letterSpacing: "-0.01em",
  color: vars.ink,
  margin: 0,
});

export const featureBody = style({
  fontSize: 13,
  color: vars.muted,
  lineHeight: 1.45,
  margin: 0,
});
