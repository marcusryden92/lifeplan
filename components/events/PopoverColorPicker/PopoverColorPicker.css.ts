import { style, styleVariants } from "@vanilla-extract/css";
import {
  vars,
  interactiveTransition,
  radii,
  space,
  borderWidth,
  zIndex,
} from "@/lib/theme";

const SWATCH_SIZE = 16;
const GRID_COLS = 8;
const GRID_GAP = 4;
const POPUP_PAD = 10;
// Visible-row cap before the grid scrolls (keeps the popup compact even if a
// user grows the palette to 36+ swatches).
const VISIBLE_ROWS = 4;
const POPUP_MAX_HEIGHT =
  VISIBLE_ROWS * (SWATCH_SIZE + GRID_GAP) - GRID_GAP + POPUP_PAD * 2;
const POPUP_WIDTH =
  GRID_COLS * SWATCH_SIZE + (GRID_COLS - 1) * GRID_GAP + POPUP_PAD * 2;

// alignSelf prevents the popover's flex-column body from stretching this
// control across the full width — it sizes to its content.
export const trigger = style({
  alignSelf: "flex-start",
  display: "inline-flex",
  alignItems: "center",
  gap: space["2"],
  padding: `${space["1"]}px ${space["3"]}px ${space["1"]}px ${space["1"]}px`,
  borderRadius: radii.pill,
  background: vars.glass.bgSoft,
  border: `${borderWidth.hairline}px solid ${vars.glass.stroke}`,
  color: vars.ink,
  cursor: "pointer",
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  fontWeight: 600,
});

// Background is the currently applied event color — set inline by the component.
export const triggerDot = style({
  width: 18,
  height: 18,
  borderRadius: radii.pill,
  border: `${borderWidth.hairline}px solid ${vars.glass.stroke}`,
  boxShadow: `inset 0 1px 0 ${vars.glass.hi}`,
});

export const triggerLabel = style({
  color: vars.inkSoft,
});

// Layered on top of the popover() recipe, which owns the glass surface; this
// class adds the swatch-grid geometry and scroll behavior.
export const popup = style({
  width: POPUP_WIDTH,
  maxHeight: POPUP_MAX_HEIGHT,
  overflowY: "auto",
  overflowX: "hidden",
  scrollbarGutter: "stable",
  padding: POPUP_PAD,
  zIndex: zIndex.popoverOverPalette,
  display: "grid",
  gridTemplateColumns: `repeat(${GRID_COLS}, ${SWATCH_SIZE}px)`,
  gap: GRID_GAP,
  justifyContent: "center",
});

// Swatch background is the per-color value — set inline by the component.
const swatchBase = style({
  width: SWATCH_SIZE,
  height: SWATCH_SIZE,
  borderRadius: radii.pill,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  transition: interactiveTransition("transform", "box-shadow"),
});

export const swatch = styleVariants({
  active: [
    swatchBase,
    {
      border: `${borderWidth.hairline}px solid ${vars.ink}`,
      boxShadow: `0 0 0 1.5px ${vars.paper}, 0 0 0 2.5px ${vars.ink}`,
    },
  ],
  inactive: [
    swatchBase,
    {
      border: `${borderWidth.hairline}px solid ${vars.glass.stroke}`,
      boxShadow: "none",
    },
  ],
});
