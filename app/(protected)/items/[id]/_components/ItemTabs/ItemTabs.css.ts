import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

export const tabsStrip = style({
  display: "flex",
  gap: 6,
  marginTop: 22,
  borderBottom: `1px solid ${vars.rule}`,
  flexWrap: "wrap",
});

export const tab = style({
  padding: "10px 16px",
  fontFamily: vars.font.ui,
  fontSize: 13,
  fontWeight: 600,
  color: vars.inkSoft,
  borderBottom: "2px solid transparent",
  marginBottom: -1,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition: themeTransition,
  selectors: {
    "&:hover": {
      color: vars.ink,
    },
  },
});

export const tabActive = style({
  color: vars.ink,
  borderBottomColor: vars.accent.now,
});

export const tabCount = style({
  color: vars.muted,
  fontWeight: 500,
  fontSize: 11.5,
  fontVariantNumeric: "tabular-nums",
});

export const tabDisabled = style({
  color: vars.muted,
  opacity: 0.45,
  cursor: "not-allowed",
  pointerEvents: "none",
});

export const tabSpacer = style({ flex: 1 });

export const coachTrigger = style({
  appearance: "none",
  border: "none",
  background: "transparent",
  padding: "10px 14px",
  marginBottom: -1,
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  fontWeight: 600,
  letterSpacing: "0.02em",
  color: vars.inkSoft,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderBottom: "2px solid transparent",
  transition: themeTransition,
  selectors: {
    "&:hover": {
      color: vars.ink,
    },
  },
});
