import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

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

export const nextCard = style({
  borderRadius: 20,
  padding: "18px 20px",
  boxShadow: vars.shadow.panelSm,
  transition: themeTransition,
});

export const nextCardLabel = style({
  display: "inline-block",
});

export const nextCardTitle = style({
  fontFamily: vars.font.display,
  fontSize: 24,
  fontWeight: 500,
  letterSpacing: "-0.03em",
  marginTop: 6,
  color: vars.ink,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const nextCardSub = style({
  fontSize: 13,
  color: vars.inkSoft,
  marginTop: 4,
  fontFamily: vars.font.ui,
  fontWeight: 500,
  transition: themeTransition,
});

export const nextCardActions = style({
  display: "flex",
  gap: 8,
  marginTop: 14,
});

export const helperSuggestion = style({
  padding: "8px 12px",
  borderRadius: 14,
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
  borderRadius: 999,
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
