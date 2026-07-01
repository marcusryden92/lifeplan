import { style } from "@vanilla-extract/css";
import { vars, themeTransition, radii } from "@/lib/theme";

export const card = style({
  padding: "12px 0",
  borderBottom: `1px solid ${vars.rule}`,
  transition: themeTransition,
  selectors: {
    "&:last-child": { borderBottom: "none" },
  },
});

export const cardHeaderRow = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 10,
});

export const cardSectionTitle = style({
  fontFamily: vars.font.display,
  fontSize: 16,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  transition: themeTransition,
});

export const nextCardHeaderRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 8,
});

export const nextCardLink = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: vars.muted,
  textDecoration: "none",
  transition: themeTransition,
  selectors: {
    "&:hover": { color: vars.ink },
  },
});

export const nextCardTitle = style({
  fontFamily: vars.font.display,
  fontSize: 18,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const nextCardSub = style({
  fontSize: 12.5,
  color: vars.inkSoft,
  marginTop: 2,
  fontFamily: vars.font.ui,
  fontWeight: 500,
  transition: themeTransition,
});

export const nextCardBody = style({
  // Reserves room for title (~22px) + marginTop (2) + sub (~17px) so the
  // empty "Not scheduled yet" state takes the same vertical space.
  minHeight: 42,
});

export const helperSuggestion = style({
  padding: "8px 12px",
  borderRadius: radii["md+2"],
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.rule}`,
  fontSize: 12.5,
  color: vars.inkSoft,
  fontWeight: 500,
  fontFamily: vars.font.ui,
  transition: themeTransition,
});

export const helperPillRow = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 10,
});

export const helperPill = style({
  padding: "3px 10px",
  borderRadius: radii.pill,
  background: vars.glass.bgDeep,
  border: `1px solid ${vars.glass.stroke}`,
  fontSize: 11,
  fontWeight: 600,
  color: vars.ink,
  fontFamily: vars.font.ui,
  transition: themeTransition,
});

export const whyText = style({
  fontSize: 12.5,
  color: vars.inkSoft,
  marginTop: 6,
  lineHeight: 1.5,
  fontFamily: vars.font.ui,
  fontWeight: 500,
  transition: themeTransition,
});
