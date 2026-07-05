import { globalStyle, style } from "@vanilla-extract/css";
import { space, vars, contentWidth, media, radii } from "@/lib/theme";


// ---------- page chrome ----------
// No horizontal padding â€” sections handle their own. This lets full-bleed
// sections (e.g. the dark prose section) reach the viewport edge cleanly
// while bezeled elements (hero, close card) supply their own 12px inset.
// `main` itself is the scroll container so the `.custom-scrollbar` rules
// from globals.css apply (instead of the browser's default page scrollbar).
export const page = style({
  height: "100vh",
  width: "100%",
  boxSizing: "border-box",
  background: vars.paper,
  padding: 0,
  color: vars.ink,
  overflowY: "auto",
  overflowX: "hidden",
});

// ---------- top navigation ----------
export const navBar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space["4"],
  padding: "8px clamp(12px, 1.6vw, 28px)",
  flexShrink: 0,
  "@media": {
    [media.mobile]: { padding: "14px 20px" },
  },
});

export const navWordmark = style({
  fontFamily: vars.font.display,
  fontSize: 24,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  textDecoration: "none",
  lineHeight: 1,
});

export const navActions = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
});

// ---------- hero ----------
// Matches the original flex:2 of an aboveFold of height calc(100vh - 24px)
// with a 5px gap â€” i.e. (100vh - 29px) * 2/3. Self-bezeled (12px inline
// margin) since the page no longer pads horizontally.
export const hero = style({
  position: "relative",
  borderRadius: radii["3xl"],
  overflow: "hidden",
  isolation: "isolate",
  background: vars.paper,
  height: "calc((100vh - 29px) * 2 / 3)",
  marginInline: space["3"],
  "@media": {
    [media.mobile]: {
      borderRadius: radii.none,
      height: "calc(100vh * 2 / 3)",
      marginInline: 0,
    },
  },
});

// ---------- intro section (sits directly beneath the hero) ----------
// Edge-aligned with the hero card so the headline reads as the wordmark
// did in the original layout: large, immediately below the vector field,
// not pushed into a narrow centered column.
export const introSection = style({
  padding:
    "28px clamp(12px, 1.6vw, 28px) clamp(72px, 9vw, 120px) clamp(28px, 4vw, 80px)",
  display: "flex",
  flexDirection: "column",
  gap: space["6"],
  "@media": {
    [media.mobile]: { padding: "32px 24px 64px", gap: space["5"] },
  },
});

export const introHeadline = style({
  fontFamily: vars.font.display,
  fontSize: "clamp(36px, 4.8vw, 72px)",
  fontWeight: 400,
  letterSpacing: "-0.025em",
  lineHeight: 1.05,
  color: vars.ink,
  margin: 0,
  maxWidth: contentWidth.lg,
});

globalStyle(`${introHeadline} em`, {
  fontStyle: "italic",
  fontWeight: 400,
  color: vars.accent.primary,
});

export const introSubhead = style({
  fontFamily: vars.font.display,
  fontSize: "clamp(22px, 2.6vw, 32px)",
  fontWeight: 400,
  letterSpacing: "-0.015em",
  lineHeight: 1.25,
  color: vars.inkSoft,
  margin: 0,
  marginTop: space["1"],
});

export const introBody = style({
  display: "flex",
  flexDirection: "column",
  gap: space["3.5"],
  fontFamily: vars.font.ui,
  fontSize: "clamp(15px, 1.15vw, 17px)",
  lineHeight: 1.6,
  color: vars.inkSoft,
  maxWidth: contentWidth.sm,
  marginTop: space["2"],
});

globalStyle(`${introBody} p`, { margin: 0 });

export const introCta = style({
  display: "flex",
  alignItems: "center",
  gap: space["3.5"],
  marginTop: space["3"],
  flexWrap: "wrap",
});

export const introCtaNote = style({
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  color: vars.muted,
  letterSpacing: "0.01em",
});

// ---------- editorial sections ----------
export const prose = style({
  display: "flex",
  flexDirection: "column",
});

const proseSectionBase = style({
  padding: "clamp(96px, 10vw, 160px) clamp(12px, 1.6vw, 28px)",
  position: "relative",
  "@media": {
    [media.mobile]: { padding: "72px 24px" },
  },
});

// Light prose section. Sections 1 and 4 (within the prose container) pick
// up a soft tint via :nth-child so adjacent light sections don't blur into
// each other. The dark section at position 3 uses a different class and
// is unaffected by these selectors.
export const proseSection = style([
  proseSectionBase,
  {
    background: vars.paper,
    color: vars.ink,
    borderTop: `1px solid ${vars.rule}`,
    selectors: {
      "&:nth-child(1), &:nth-child(4)": {
        background: `color-mix(in srgb, ${vars.ink} 5%, ${vars.paper})`,
      },
    },
  },
]);

// Dark inverse â€” used for one mid-page section to break the rhythm.
export const proseSectionDark = style([
  proseSectionBase,
  {
    background: vars.ink,
    color: vars.paper,
  },
]);

// Asymmetric two-column: marker on the left, content on the right.
// Left column is fixed-ish; right column flows to a comfortable measure.
export const proseGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(180px, 240px) minmax(0, 1fr)",
  gap: "clamp(32px, 6vw, 96px)",
  maxWidth: contentWidth["2xl"],
  margin: "0 auto",
  alignItems: "start",
  "@media": {
    [media.mobile]: {
      gridTemplateColumns: "1fr",
      gap: space["7"],
    },
  },
});

export const proseAside = style({
  display: "flex",
  flexDirection: "column",
  gap: space["3.5"],
  fontFamily: vars.font.ui,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: vars.muted,
  position: "sticky",
  top: 24,
  "@media": {
    [media.mobile]: {
      position: "static",
      flexDirection: "row",
      alignItems: "center",
      gap: space["3"],
    },
  },
});

export const proseNumber = style({
  fontFamily: vars.font.display,
  fontSize: 22,
  fontWeight: 400,
  letterSpacing: "-0.01em",
  color: "currentColor",
  textTransform: "none",
});

globalStyle(`${proseNumber} span`, {
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.14em",
  color: vars.muted,
  marginLeft: space["2"],
});

// Short horizontal hairline that ties the aside marker to the page rhythm.
export const proseRule = style({
  display: "block",
  width: 48,
  height: 1,
  background: "currentColor",
  opacity: 0.35,
  "@media": {
    [media.mobile]: { display: "none" },
  },
});

export const proseHeading = style({
  fontFamily: vars.font.display,
  fontSize: "clamp(32px, 4.2vw, 60px)",
  fontWeight: 400,
  letterSpacing: "-0.025em",
  lineHeight: 1.05,
  color: "currentColor",
  margin: 0,
  marginBottom: "clamp(32px, 3.5vw, 48px)",
  maxWidth: contentWidth.md,
});

export const proseBody = style({
  display: "flex",
  flexDirection: "column",
  gap: space["5"],
  fontFamily: vars.font.ui,
  maxWidth: 680,
});

export const proseLine = style({
  fontSize: "clamp(16px, 1.15vw, 18px)",
  lineHeight: 1.6,
  color: "currentColor",
  opacity: 0.78,
  margin: 0,
});

// Pull-quote: emphasized line breaks out of the body flow with a hanging
// accent rule on the left and a larger display setting.
export const proseEmphasis = style({
  fontFamily: vars.font.display,
  fontSize: "clamp(22px, 2vw, 30px)",
  lineHeight: 1.25,
  fontWeight: 400,
  letterSpacing: "-0.015em",
  color: "currentColor",
  margin: 0,
  marginTop: space["2"],
  marginBottom: space["2"],
  paddingLeft: space["5"],
  borderLeft: `2px solid ${vars.accent.primary}`,
});

// ---------- features â€” concrete capability tiles ----------
export const featuresSection = style({
  padding: "clamp(96px, 10vw, 160px) clamp(12px, 1.6vw, 28px)",
  borderTop: `1px solid ${vars.rule}`,
  "@media": {
    [media.mobile]: { padding: "72px 24px" },
  },
});

export const featuresHeader = style({
  maxWidth: contentWidth["2xl"],
  margin: "0 auto",
  marginBottom: "clamp(40px, 5vw, 64px)",
  display: "flex",
  flexDirection: "column",
  gap: space["3"],
});

export const featuresKicker = style({
  fontFamily: vars.font.ui,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: vars.muted,
  margin: 0,
});

export const featuresHeading = style({
  fontFamily: vars.font.display,
  fontSize: "clamp(32px, 4.2vw, 60px)",
  fontWeight: 400,
  letterSpacing: "-0.025em",
  lineHeight: 1.05,
  color: vars.ink,
  margin: 0,
});

export const featuresList = style({
  maxWidth: contentWidth["2xl"],
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "clamp(72px, 9vw, 128px)",
});

// Two-column subsection â€” icon side + content side. Ordering is done in
// JSX so vanilla-extract doesn't need descendant selectors; the reverse
// variant is here as a stable hook in case we want to style asymmetries
// per-side later.
export const featureRow = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "clamp(32px, 6vw, 96px)",
  alignItems: "center",
  "@media": {
    [media.mobile]: {
      gridTemplateColumns: "1fr",
      gap: space["6"],
    },
  },
});

export const featureRowReverse = style([featureRow, {}]);

export const featureVisual = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 200,
  "@media": {
    [media.mobile]: { minHeight: 0, justifyContent: "flex-start" },
  },
});

// Neutral ash wash behind the lucide stroke icon. Ink at low opacity so
// the icon reads as a quiet monochrome accent, not a colored chip.
export const featureIconWrap = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 168,
  height: 168,
  borderRadius: radii.pill,
  background: `color-mix(in srgb, ${vars.ink} 5%, transparent)`,
  color: vars.ink,
  "@media": {
    [media.mobile]: { width: 120, height: 120 },
  },
});

globalStyle(`${featureIconWrap} svg`, { display: "block" });

export const featureContent = style({
  display: "flex",
  flexDirection: "column",
  gap: space["3.5"],
  maxWidth: contentWidth.xs,
});

export const featureIndex = style({
  fontFamily: vars.font.ui,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: vars.muted,
});

export const featureName = style({
  fontFamily: vars.font.display,
  fontSize: "clamp(26px, 2.8vw, 38px)",
  fontWeight: 400,
  letterSpacing: "-0.02em",
  lineHeight: 1.1,
  color: vars.ink,
  margin: 0,
});

export const featureBody = style({
  fontFamily: vars.font.ui,
  fontSize: "clamp(15px, 1.1vw, 17px)",
  lineHeight: 1.6,
  color: vars.inkSoft,
  margin: 0,
});

// ---------- close â€” ink-tinted card ----------
// Card width matches the hero/vector field: it fills the page bezel
// (page already supplies 12px horizontal padding), so the section adds
// only vertical padding.
export const closeSection = style({
  padding: "clamp(72px, 8vw, 120px) 0",
  "@media": {
    [media.mobile]: { padding: "72px 0" },
  },
});

export const closeCard = style({
  borderRadius: radii["3xl"],
  background: vars.ink,
  color: vars.paper,
  padding: "clamp(72px, 9vw, 120px) clamp(32px, 6vw, 96px)",
  marginInline: space["3"],
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: space["3.5"],
  "@media": {
    [media.mobile]: { padding: "64px 28px", borderRadius: radii.none, marginInline: 0 },
  },
});

export const closeHeading = style({
  fontFamily: vars.font.display,
  fontSize: "clamp(34px, 5vw, 60px)",
  fontWeight: 400,
  letterSpacing: "-0.025em",
  lineHeight: 1.05,
  margin: 0,
  maxWidth: contentWidth.sm,
});

export const closeBody = style({
  fontFamily: vars.font.ui,
  fontSize: "clamp(15px, 1.15vw, 17px)",
  lineHeight: 1.5,
  color: "rgba(242,239,234,0.78)",
  margin: 0,
  maxWidth: contentWidth.xs,
});

export const closeActions = style({
  display: "flex",
  gap: space["2.5"],
  marginTop: space["5"],
  flexWrap: "wrap",
  justifyContent: "center",
});

export const closeNote = style({
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  color: "rgba(242,239,234,0.55)",
  margin: 0,
  marginTop: space["2"],
  letterSpacing: "0.01em",
});

// ---------- footer ----------
export const footer = style({
  padding: "32px clamp(24px, 6vw, 96px) 40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space["4"],
  borderTop: `1px solid ${vars.rule}`,
  color: vars.muted,
  fontSize: 12,
  fontFamily: vars.font.ui,
  "@media": {
    [media.mobile]: {
      flexDirection: "column",
      alignItems: "flex-start",
      padding: "24px 24px 32px",
    },
  },
});

export const footerLinks = style({
  display: "flex",
  gap: space["5"],
});

export const footerLink = style({
  color: vars.muted,
  textDecoration: "none",
  selectors: {
    "&:hover": { color: vars.ink },
  },
});
