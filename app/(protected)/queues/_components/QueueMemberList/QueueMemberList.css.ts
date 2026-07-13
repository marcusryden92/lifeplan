import { style, globalStyle } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  interactiveTransition,
  radii,
  text,
  iconBtn,
} from "@/lib/theme";

export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: space["0.5"],
  padding: "4px 0",
});

export const memberRow = style([
  text.row,
  {
    display: "flex",
    alignItems: "center",
    gap: space["2.5"],
    padding: "8px 10px",
    borderRadius: radii.sm,
    color: vars.ink,
    background: "transparent",
    border: "1px solid transparent",
    transition: themeTransition,
    width: "100%",
    selectors: {
      "&:hover": {
        background: vars.interactive.hoverFill,
      },
    },
  },
]);

globalStyle(`${memberRow}[data-dragging="true"]`, {
  opacity: 0.4,
});

globalStyle(`${memberRow}[data-drag-over="before"]`, {
  boxShadow: `inset 0 2px 0 0 ${vars.accent.primary}`,
});

globalStyle(`${memberRow}[data-drag-over="after"]`, {
  boxShadow: `inset 0 -2px 0 0 ${vars.accent.primary}`,
});

export const orderNumber = style([
  text.microLabel,
  {
    width: 18,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    color: vars.muted,
    flexShrink: 0,
  },
]);

export const memberTitle = style({
  minWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
});

export const memberTitleLink = style({
  color: "inherit",
  textDecoration: "none",
  selectors: {
    "&:hover": { textDecoration: "underline" },
  },
});

export const memberCompleted = style({
  opacity: 0.55,
  textDecoration: "line-through",
});

export const memberHint = style([
  text.microLabel,
  {
    color: vars.muted,
    fontStyle: "italic",
    flexShrink: 0,
  },
]);

export const inheritedBadge = style({
  opacity: 0.55,
});

export const memberSpacer = style({
  flex: 1,
});

export const memberDuration = style([
  text.microLabel,
  {
    fontVariantNumeric: "tabular-nums",
    color: vars.muted,
    flexShrink: 0,
  },
]);

export const memberRemove = style([
  iconBtn({ size: "sm" }),
  {
    color: vars.muted,
    opacity: 0,
    transition: interactiveTransition("opacity", "color", "background-color"),
    selectors: {
      [`${memberRow}:hover &`]: { opacity: 1 },
      "&:focus-visible": {
        opacity: 1,
        outline: `1px solid ${vars.accent.primary}`,
      },
    },
  },
]);

export const emptyNote = style([
  text.bodySm,
  {
    padding: "18px 10px",
    color: vars.muted,
    textAlign: "center",
  },
]);
