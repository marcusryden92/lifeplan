import { style } from "@vanilla-extract/css";
import { vars } from "@/lib/theme/tokens.css";
import { space, radii } from "@/lib/theme/scales";
import { colorMixAlpha } from "@/lib/theme/effects";

export const mutedText = style({
  color: vars.muted,
});

export const sourceRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["1.5"],
  fontSize: 12,
  color: vars.muted,
});

export const switchRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space["3"],
  padding: `${space["2"]}px ${space["2.5"]}px`,
  borderRadius: radii.sm,
  background: `color-mix(in srgb, ${vars.ink} ${colorMixAlpha.subtleFill}%, transparent)`,
});

export const switchLabel = style({
  display: "flex",
  flexDirection: "column",
  gap: space["0.5"],
  minWidth: 0,
});

export const switchTitle = style({
  fontSize: 12.5,
  fontWeight: 600,
  color: vars.ink,
});

export const switchHint = style({
  fontSize: 11,
  color: vars.muted,
});

export const footerActions = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space["3"],
  paddingTop: space["2"],
  borderTop: `1px solid ${vars.rule}`,
});

export const settingsLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space["1"],
  fontSize: 11.5,
  fontWeight: 500,
  color: vars.muted,
  textDecoration: "none",
  ":hover": {
    color: vars.ink,
  },
});
