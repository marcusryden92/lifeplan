import { style } from "@vanilla-extract/css";
import { space, vars, themeTransition } from "@/lib/theme";

export const card = style({
  padding: "12px 0",
  borderBottom: `1px solid ${vars.rule}`,
  transition: themeTransition,
  selectors: {
    "&:last-child": { borderBottom: "none" },
  },
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
  gap: space["2"],
  marginBottom: space["2"],
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
  marginTop: space["0.5"],
  fontFamily: vars.font.ui,
  fontWeight: 500,
  transition: themeTransition,
});

export const nextCardBody = style({
  // Reserves room for title (~22px) + marginTop (2) + sub (~17px) so the
  // empty "Not scheduled yet" state takes the same vertical space.
  minHeight: 42,
});

export const whyText = style({
  fontSize: 12.5,
  color: vars.inkSoft,
  marginTop: space["1.5"],
  lineHeight: 1.5,
  fontFamily: vars.font.ui,
  fontWeight: 500,
  transition: themeTransition,
});
