import { style, styleVariants } from "@vanilla-extract/css";
import {
  vars,
  interactiveTransition,
  radii,
  space,
  borderWidth,
} from "@/lib/theme";

const base = style({
  fontFamily: vars.font.ui,
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.45,
    },
  },
});

// Left-aligned list row (the "Open full editor" / "Duplicate" / "Delete" tier).
const row = style([
  base,
  {
    display: "flex",
    alignItems: "center",
    gap: space["2.5"],
    padding: `${space["1.5"]}px ${space["2"]}px`,
    borderRadius: radii.sm,
    border: "none",
    background: "transparent",
    fontSize: 12.5,
    color: vars.ink,
    textAlign: "left",
    transition: interactiveTransition("background"),
    selectors: {
      "&:hover:not(:disabled)": { background: vars.interactive.hoverFill },
    },
  },
]);

// Centered pill (the "Complete" / "Postpone" tier). Flexes to share the row
// with its siblings.
const pill = style([
  base,
  {
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: space["1.5"],
    padding: `${space["2"]}px ${space["3"]}px`,
    borderRadius: radii.pill,
    fontSize: 12,
    fontWeight: 600,
  },
]);

export const action = styleVariants({
  row: [row],
  danger: [row, { color: vars.status.error }],
  primary: [
    pill,
    {
      border: `${borderWidth.hairline}px solid ${vars.glass.stroke}`,
      background: vars.glass.bgDeep,
      color: vars.ink,
    },
  ],
  primaryFilled: [
    pill,
    {
      border: `${borderWidth.hairline}px solid ${vars.ink}`,
      background: vars.ink,
      color: vars.paper,
    },
  ],
});

export const iconSlot = styleVariants({
  row: { display: "inline-flex", color: vars.muted },
  danger: { display: "inline-flex", color: vars.status.error },
  primary: { display: "inline-flex" },
  primaryFilled: { display: "inline-flex" },
});
