import { style } from "@vanilla-extract/css";
import { vars, space, radii } from "@/lib/theme";

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: space["3"],
  padding: space["5"],
  borderRadius: radii.xl,
  border: `1px solid ${vars.rule}`,
  background: vars.glass.bgSoft,
});

export const head = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space["3"],
});

export const title = style({
  fontFamily: vars.font.display,
  fontSize: 17,
  fontWeight: 600,
  color: vars.ink,
  margin: 0,
});

export const dismiss = style({
  appearance: "none",
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  padding: space["1"],
  borderRadius: radii.sm,
  display: "inline-flex",
  selectors: {
    "&:hover": { color: vars.ink, background: vars.interactive.hoverFill },
  },
});

export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: space["1"],
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const row = style({
  display: "flex",
  alignItems: "center",
  gap: space["2.5"],
  padding: space["2"],
  borderRadius: radii.md,
});

export const rowButton = style({
  appearance: "none",
  border: "none",
  background: "transparent",
  width: "100%",
  textAlign: "left",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: space["2.5"],
  padding: space["2"],
  borderRadius: radii.md,
  color: "inherit",
  font: "inherit",
  selectors: {
    "&:hover": { background: vars.interactive.hoverFill },
  },
});

export const mark = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  height: 18,
  flexShrink: 0,
  color: vars.muted,
});

export const markDone = style({
  color: vars.accent.done,
});

export const label = style({
  fontSize: 14,
  color: vars.ink,
  flex: 1,
});

export const labelDone = style({
  color: vars.muted,
  textDecoration: "line-through",
});

export const optional = style({
  fontSize: 12,
  color: vars.muted,
});
