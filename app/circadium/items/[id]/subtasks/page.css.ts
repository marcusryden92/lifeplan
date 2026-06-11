import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

export const card = style({
  display: "flex",
  flexDirection: "column",
});

export const legacyCardDisabled = style({
  opacity: 0.5,
  pointerEvents: "none",
});

export const cardHeader = style({
  padding: "12px 0",
  borderBottom: `1px solid ${vars.rule}`,
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 12,
  transition: themeTransition,
});

export const cardTitle = style({
  fontFamily: vars.font.display,
  fontSize: 17,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  transition: themeTransition,
});

export const cardSubtitle = style({
  marginTop: 3,
  display: "block",
});

export const cardBody = style({
  padding: "12px 0 16px",
});
