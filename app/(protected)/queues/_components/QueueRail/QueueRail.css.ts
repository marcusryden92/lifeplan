import { style, globalStyle } from "@vanilla-extract/css";
import { space, vars, themeTransition, radii, text } from "@/lib/theme";

export const railRow = style([
  text.row,
  {
    display: "flex",
    alignItems: "center",
    gap: space["2"],
    padding: "6px 8px",
    borderRadius: radii.sm,
    cursor: "pointer",
    color: vars.ink,
    background: "transparent",
    border: "1px solid transparent",
    transition: themeTransition,
    textAlign: "left",
    width: "100%",
    selectors: {
      "&:hover": {
        background: vars.interactive.hoverFill,
      },
    },
  },
]);

export const railRowActive = style({
  background: vars.glass.bgDeep,
  borderColor: vars.glass.stroke,
  fontWeight: 600,
});

export const railRowLabel = style({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
});

export const railRowCount = style([
  text.microLabel,
  {
    fontVariantNumeric: "tabular-nums",
    color: vars.muted,
    transition: themeTransition,
  },
]);

// Shared drag-reorder grammar: dragged row dims, 2px accent inset lines mark
// the before/after drop zones.
globalStyle(`${railRow}[data-dragging="true"]`, {
  opacity: 0.4,
});

globalStyle(`${railRow}[data-drag-over="before"]`, {
  boxShadow: `inset 0 2px 0 0 ${vars.accent.primary}`,
});

globalStyle(`${railRow}[data-drag-over="after"]`, {
  boxShadow: `inset 0 -2px 0 0 ${vars.accent.primary}`,
});
