import { style } from "@vanilla-extract/css";
import { space, vars, themeTransition, radii } from "@/lib/theme";

export const selectedPanel = style({
  flexShrink: 0,
  padding: "16px 18px",
  borderBottom: `1px solid ${vars.rule}`,
  background: `color-mix(in srgb, ${vars.ink} 3%, transparent)`,
});

export const selectedHeaderRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  marginBottom: space["2.5"],
});

export const selectedSwatch = style({
  width: 10,
  height: 10,
  borderRadius: radii.pill,
  flexShrink: 0,
  boxShadow: `0 0 0 1px color-mix(in srgb, ${vars.ink} 14%, transparent)`,
});

export const selectedTitle = style({
  fontFamily: vars.font.display,
  fontSize: 18,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const fieldGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: space["2"],
  marginBottom: space["2"],
});

export const field = style({
  display: "flex",
  flexDirection: "column",
  gap: space["1"],
});

export const fieldWithMargin = style({
  display: "flex",
  flexDirection: "column",
  gap: space["1"],
  marginBottom: space["2"],
});

export const fieldLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
});

export const fieldInput = style({
  appearance: "none",
  border: `1px solid ${vars.rule}`,
  background: vars.paper,
  padding: "6px 10px",
  borderRadius: radii.sm,
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  color: vars.ink,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
  selectors: {
    "&:focus": {
      outline: "none",
      borderColor: `color-mix(in srgb, ${vars.accent.primary} 60%, ${vars.rule})`,
    },
  },
});

export const fieldStatic = style({
  padding: "6px 0",
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  fontWeight: 500,
  color: vars.ink,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const swatchRow = style({
  display: "flex",
  gap: space["1.5"],
  flexWrap: "wrap",
});

export const swatchChip = style({
  width: 22,
  height: 22,
  borderRadius: radii.xs,
  cursor: "pointer",
  border: `1px solid ${vars.rule}`,
  padding: 0,
  selectors: {
    "&[data-active='true']": {
      boxShadow: `0 0 0 2px ${vars.ink}`,
    },
  },
});

export const selectedActions = style({
  display: "flex",
  gap: space["1.5"],
  marginTop: space["2.5"],
  flexWrap: "wrap",
});
