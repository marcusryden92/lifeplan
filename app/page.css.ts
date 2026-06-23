import { style } from "@vanilla-extract/css";
import { vars } from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

// ---------- page chrome ----------
// Same 5/12px bezel padding pattern AppShell uses; page background is paper,
// locked to light via themeLight applied in page.tsx.
export const page = style({
  minHeight: "100vh",
  width: "100vw",
  boxSizing: "border-box",
  background: vars.paper,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 5,
  color: vars.ink,
  "@media": {
    [MOBILE]: { padding: 0, gap: 0 },
  },
});

// ---------- above-the-fold container ----------
// Hero card (2/3) + title row (1/3) fill the first viewport. Sections beyond
// scroll naturally below.
export const aboveFold = style({
  height: "calc(100vh - 24px)",
  display: "flex",
  flexDirection: "column",
  gap: 5,
  "@media": {
    [MOBILE]: { height: "100vh", gap: 0 },
  },
});

export const hero = style({
  position: "relative",
  flex: 2,
  borderRadius: 30,
  overflow: "hidden",
  isolation: "isolate",
  background: vars.paper,
  "@media": {
    [MOBILE]: { borderRadius: 0 },
  },
});

// ---------- title row ----------
// Tightened horizontal padding so the wordmark sits close to the left edge,
// plus a bottom rule that ties wordmark + CTA cluster together.
export const titleRow = style({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 24,
  padding: "0 clamp(12px, 1.6vw, 28px)",
  borderBottom: `1px solid ${vars.rule}`,
  "@media": {
    [MOBILE]: {
      flexDirection: "column",
      alignItems: "flex-start",
      justifyContent: "center",
      gap: 16,
      padding: "20px 24px",
    },
  },
});

export const wordmark = style({
  fontFamily: vars.font.display,
  fontSize: "clamp(56px, 11vw, 132px)",
  fontWeight: 400,
  letterSpacing: "-0.03em",
  lineHeight: 1,
  color: vars.ink,
  margin: 0,
  userSelect: "none",
});

export const ctaCluster = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexShrink: 0,
  "@media": {
    [MOBILE]: { width: "100%" },
  },
});

// ---------- sections (below the fold) ----------
const sectionBase = style({
  padding: "96px clamp(24px, 6vw, 96px)",
  "@media": {
    [MOBILE]: { padding: "56px 24px" },
  },
});

export const sectionInner = style({
  maxWidth: 1180,
  margin: "0 auto",
  width: "100%",
});

export const featuresSection = style([sectionBase, {}]);

export const sectionLead = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: vars.muted,
  margin: 0,
  marginBottom: 14,
});

export const sectionTitle = style({
  fontFamily: vars.font.display,
  fontSize: "clamp(32px, 4.5vw, 56px)",
  fontWeight: 500,
  letterSpacing: "-0.02em",
  lineHeight: 1.05,
  color: vars.ink,
  margin: 0,
  marginBottom: 48,
  maxWidth: 760,
  "@media": {
    [MOBILE]: { marginBottom: 32 },
  },
});

export const featureGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
  "@media": {
    [MOBILE]: { gridTemplateColumns: "1fr", gap: 12 },
  },
});

export const featureTile = style({
  position: "relative",
  padding: "28px 24px 26px",
  borderRadius: 18,
  background: vars.paper,
  border: `1px solid ${vars.rule}`,
  boxShadow:
    "0 1px 0 rgba(255,255,255,0.6) inset, 0 14px 36px rgba(22,20,42,0.05)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
});

export const featureGlyph = style({
  fontFamily: vars.font.display,
  fontSize: 22,
  fontWeight: 500,
  color: vars.accent.primary,
  lineHeight: 1,
});

export const featureTitle = style({
  fontFamily: vars.font.display,
  fontSize: 20,
  fontWeight: 500,
  letterSpacing: "-0.015em",
  color: vars.ink,
  margin: 0,
});

export const featureBody = style({
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  lineHeight: 1.5,
  color: vars.inkSoft,
  margin: 0,
});

// ---------- demo section ----------
export const demoSection = style([sectionBase, { paddingTop: 32 }]);

export const demoCard = style({
  position: "relative",
  borderRadius: 24,
  background: vars.paper,
  border: `1px solid ${vars.rule}`,
  boxShadow:
    "0 1px 0 rgba(255,255,255,0.6) inset, 0 24px 60px rgba(22,20,42,0.08)",
  padding: "64px 48px",
  textAlign: "center",
  color: vars.inkSoft,
  fontFamily: vars.font.ui,
  fontSize: 13,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  fontWeight: 600,
  minHeight: 340,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "@media": {
    [MOBILE]: { padding: "48px 24px", minHeight: 240 },
  },
});

// ---------- final CTA — ink-tinted ----------
export const ctaSection = style({
  padding: "104px clamp(24px, 6vw, 96px) 112px",
  "@media": {
    [MOBILE]: { padding: "72px 24px 80px" },
  },
});

export const ctaCard = style({
  borderRadius: 30,
  background: vars.ink,
  color: vars.paper,
  padding: "72px clamp(32px, 5vw, 80px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: 12,
  "@media": {
    [MOBILE]: { padding: "56px 24px", borderRadius: 22 },
  },
});

export const ctaTitle = style({
  fontFamily: vars.font.display,
  fontSize: "clamp(36px, 5.5vw, 64px)",
  fontWeight: 400,
  letterSpacing: "-0.025em",
  lineHeight: 1.04,
  margin: 0,
});

export const ctaBody = style({
  fontFamily: vars.font.ui,
  fontSize: 15,
  color: "rgba(242,239,234,0.78)",
  margin: 0,
  maxWidth: 520,
  lineHeight: 1.5,
});

export const ctaActions = style({
  display: "flex",
  gap: 10,
  marginTop: 12,
  flexWrap: "wrap",
  justifyContent: "center",
});

// ---------- footer ----------
export const footer = style({
  padding: "32px clamp(24px, 6vw, 96px) 40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  borderTop: `1px solid ${vars.rule}`,
  color: vars.muted,
  fontSize: 12,
  fontFamily: vars.font.ui,
  "@media": {
    [MOBILE]: {
      flexDirection: "column",
      alignItems: "flex-start",
      padding: "24px 24px 32px",
    },
  },
});

export const footerLinks = style({
  display: "flex",
  gap: 18,
});

export const footerLink = style({
  color: vars.muted,
  textDecoration: "none",
  selectors: {
    "&:hover": { color: vars.ink },
  },
});
