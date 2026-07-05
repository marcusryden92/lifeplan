import { style } from "@vanilla-extract/css";
import { space, vars, themeTransition, radii } from "@/lib/theme";

export const wrap = style({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  borderRadius: radii["md+2"],
  border: `1px solid ${vars.rule}`,
  background: vars.paper,
  padding: space["2.5"],
  transition: themeTransition,
  userSelect: "text",
});

export const empty = style({
  padding: space["6"],
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontSize: 12,
  textAlign: "center",
});

export const dayGroup = style({
  display: "flex",
  flexDirection: "column",
  selectors: {
    "& + &": {
      marginTop: space["2.5"],
    },
  },
});

export const dayLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: vars.inkSoft,
  padding: "2px 8px 4px",
  transition: themeTransition,
});

export const colorDot = style({
  width: 8,
  height: 8,
  borderRadius: radii.pill,
  flexShrink: 0,
  transition: themeTransition,
  selectors: {
    "&[data-empty='true']": {
      background: "transparent",
      border: `1px solid ${vars.rule}`,
    },
  },
});

export const timeRange = style({
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  fontWeight: 600,
  color: vars.inkSoft,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
  flexShrink: 0,
  transition: themeTransition,
});

export const overnightMarker = style({
  marginLeft: space["1"],
  fontSize: 9,
  fontWeight: 700,
  color: vars.muted,
  verticalAlign: "super",
});

export const templateTitle = style({
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  fontWeight: 500,
  color: vars.ink,
  minWidth: 0,
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  transition: themeTransition,
});

export const templateTitleDeleted = style([
  templateTitle,
  {
    textDecoration: "line-through",
    textDecorationThickness: 1.5,
    color: vars.muted,
  },
]);

export const metaCluster = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space["1.5"],
  flexShrink: 0,
});

export const metaText = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  color: vars.muted,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});

export const metaSep = style({
  color: vars.rule,
  fontSize: 11,
});
