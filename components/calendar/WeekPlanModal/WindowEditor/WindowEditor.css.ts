import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

export const selectedPanel = style({
  flexShrink: 0,
  padding: "16px 18px",
  borderBottom: `1px solid ${vars.rule}`,
  background: `color-mix(in srgb, ${vars.ink} 3%, transparent)`,
});

export const selectedHeaderRow = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 10,
});

export const selectedSwatch = style({
  width: 10,
  height: 10,
  borderRadius: 999,
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
  gap: 8,
  marginBottom: 8,
});

export const field = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

export const fieldWithMargin = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  marginBottom: 8,
});

export const fieldLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
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

export const categoryRow = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  maxHeight: 140,
  overflow: "auto",
  border: `1px solid ${vars.rule}`,
  borderRadius: 8,
  padding: 4,
});

export const categoryOption = style({
  appearance: "none",
  border: "none",
  background: "transparent",
  padding: "5px 8px",
  borderRadius: 6,
  fontFamily: vars.font.ui,
  fontSize: 12,
  color: vars.ink,
  display: "flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${vars.ink} 6%, transparent)`,
    },
    "&[data-active='true']": {
      background: `color-mix(in srgb, ${vars.accent.primary} 14%, transparent)`,
      color: vars.ink,
      fontWeight: 600,
    },
  },
});

export const categoryDot = style({
  width: 8,
  height: 8,
  borderRadius: 999,
  flexShrink: 0,
});

export const selectedActions = style({
  display: "flex",
  gap: 6,
  marginTop: 10,
  flexWrap: "wrap",
});

export const unassignedHint = style({
  fontSize: 10.5,
  color: vars.muted,
  marginTop: 6,
  fontFamily: vars.font.ui,
});
