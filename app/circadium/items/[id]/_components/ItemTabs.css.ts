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
