import { style } from "@vanilla-extract/css";
import { vars, themeTransition, radii } from "@/lib/theme";

export const wrap = style({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  borderRadius: radii["md+2"],
  border: `1px solid ${vars.rule}`,
  background: vars.paper,
  padding: 10,
  transition: themeTransition,
  userSelect: "text",
});

export const empty = style({
  padding: 24,
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontSize: 12,
  textAlign: "center",
});

export const categoryGroup = style({
  display: "flex",
  flexDirection: "column",
  selectors: {
    "& + &": {
      marginTop: 12,
    },
  },
});

export const categoryHeader = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "2px 8px 4px",
});

export const categoryName = style({
  fontFamily: vars.font.ui,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: vars.inkSoft,
  transition: themeTransition,
});

export const flagChip = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  padding: "1px 6px",
  borderRadius: radii.pill,
  border: `1px solid ${vars.rule}`,
  color: vars.muted,
  whiteSpace: "nowrap",
  transition: themeTransition,
  selectors: {
    "&[data-changed='true']": {
      borderColor: vars.accent.primary,
      color: vars.accent.primary,
    },
  },
});

export const dayLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  fontWeight: 600,
  color: vars.inkSoft,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
  flexShrink: 0,
  width: 78,
  transition: themeTransition,
});

export const timeRange = style({
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  fontWeight: 600,
  color: vars.ink,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
  flexShrink: 0,
  transition: themeTransition,
});

export const timeRangeDeleted = style([
  timeRange,
  {
    textDecoration: "line-through",
    textDecorationThickness: 1.5,
    color: vars.muted,
  },
]);

export const rowSpacer = style({ flex: 1 });

export const metaCluster = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flexShrink: 0,
});
