import { style } from "@vanilla-extract/css";
import { space, vars, themeTransition, display, text } from "@/lib/theme";

export const card = style({
  padding: "12px 0",
  borderBottom: `1px solid ${vars.rule}`,
  transition: themeTransition,
  selectors: {
    "&:last-child": { borderBottom: "none" },
  },
});

export const cardSectionTitle = style([
  display.listTitle,
  {
    color: vars.ink,
    transition: themeTransition,
  },
]);

export const nextCardHeaderRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space["2"],
  marginBottom: space["2"],
});

export const nextCardLink = style([
  text.microLabel,
  {
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: vars.muted,
    textDecoration: "none",
    transition: themeTransition,
    selectors: {
      "&:hover": { color: vars.ink },
    },
  },
]);

export const nextCardTitle = style([
  display.panelTitle,
  {
    color: vars.ink,
    fontVariantNumeric: "tabular-nums",
    transition: themeTransition,
  },
]);

export const nextCardSub = style([
  text.bodySm,
  {
    color: vars.inkSoft,
    marginTop: space["0.5"],
    transition: themeTransition,
  },
]);

export const nextCardBody = style({
  // Reserves room for title (~22px) + marginTop (2) + sub (~17px) so the
  // empty "Not scheduled yet" state takes the same vertical space.
  minHeight: 42,
});

export const whyText = style([
  text.bodySm,
  {
    color: vars.inkSoft,
    marginTop: space["1.5"],
    lineHeight: 1.5,
    transition: themeTransition,
  },
]);
