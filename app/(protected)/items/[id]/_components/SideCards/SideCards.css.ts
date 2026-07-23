import { style } from "@vanilla-extract/css";
import { vars } from "@/lib/theme/tokens.css";
import { space } from "@/lib/theme/scales";
import { display, text } from "@/lib/theme/typography.css";
import { themeTransition } from "@/lib/theme/transitions";

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

export const depGroupLabel = style([
  text.microLabel,
  {
    display: "block",
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: vars.muted,
    marginTop: space["2.5"],
    marginBottom: space["1"],
    transition: themeTransition,
  },
]);

export const depRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  padding: "4px 0",
  minWidth: 0,
});

export const depTitleLink = style([
  text.bodySm,
  {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    color: vars.ink,
    textDecoration: "none",
    transition: themeTransition,
    selectors: {
      "&:hover": { textDecoration: "underline" },
    },
  },
]);

export const depRemove = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 20,
  height: 20,
  border: "none",
  background: "transparent",
  borderRadius: 4,
  color: vars.muted,
  cursor: "pointer",
  flexShrink: 0,
  transition: themeTransition,
  selectors: {
    "&:hover": {
      color: vars.ink,
      background: vars.interactive.hoverFill,
    },
  },
});

export const depPickerRow = style({
  marginTop: space["2"],
  minHeight: 42,
});

export const depError = style([
  text.bodySm,
  {
    color: vars.status.error,
    marginTop: space["1.5"],
    lineHeight: 1.45,
  },
]);

export const depEmpty = style([
  text.bodySm,
  {
    color: vars.muted,
    padding: "2px 0",
  },
]);
