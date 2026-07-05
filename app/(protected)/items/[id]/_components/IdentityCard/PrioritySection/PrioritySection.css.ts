import { style } from "@vanilla-extract/css";
import { space, vars, themeTransition } from "@/lib/theme";

export const cardHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space["3"],
  padding: "12px 0",
  borderBottom: `1px solid ${vars.rule}`,
  transition: themeTransition,
  flexWrap: "wrap",
});

export const cardTitle = style({
  fontFamily: vars.font.display,
  fontSize: 17,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  transition: themeTransition,
});

export const priorityRow = style({
  display: "flex",
  gap: space["1"],
  flexWrap: "nowrap",
});

export const priorityPill = style({
  flex: "0 0 auto",
  width: 28,
  height: 28,
  border: `1px solid ${vars.glass.stroke}`,
  background: "transparent",
  padding: 0,
  borderRadius: "50%",
  cursor: "pointer",
  fontSize: 12.5,
  fontFamily: vars.font.ui,
  fontWeight: 700,
  color: vars.inkSoft,
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
  selectors: {
    "&:hover": { color: vars.ink, borderColor: vars.rule },
  },
});

export const priorityPillActive = style({
  background: vars.ink,
  color: vars.paper,
  borderColor: vars.ink,
});
