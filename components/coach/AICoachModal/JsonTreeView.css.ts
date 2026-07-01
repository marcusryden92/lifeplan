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
});

export const empty = style({
  padding: 24,
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontSize: 12,
  textAlign: "center",
});

export const nodeBlock = style({
  display: "flex",
  flexDirection: "column",
});

export const row = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "4px 8px",
  minWidth: 0,
  borderRadius: radii.sm,
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.interactive.hoverFill,
    },
  },
});

export const title = style({
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

export const metaCluster = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flexShrink: 0,
});

export const duration = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 600,
  color: vars.inkSoft,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const deadline = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  color: vars.muted,
  fontVariantNumeric: "tabular-nums",
});

export const metaSep = style({
  color: vars.rule,
  fontSize: 11,
});

export const readyDot = style({
  width: 6,
  height: 6,
  borderRadius: radii.pill,
  background: vars.status.success,
  display: "inline-block",
});

// Left-indent border matches the drag-and-drop nested list convention. Smaller
// left offset than lumenTasks since the coach tree has no grip/chevron gutter.
export const childrenWrap = style({
  marginLeft: 12,
  paddingLeft: 10,
  borderLeft: `1px solid ${vars.rule}`,
  transition: themeTransition,
});
