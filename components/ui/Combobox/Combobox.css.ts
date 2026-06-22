import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

export const comboboxWrap = style({
  position: "relative",
  display: "inline-block",
});

export const comboboxTrigger = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 10px",
  borderRadius: 999,
  background: vars.glass.bgDeep,
  border: `1px solid ${vars.glass.stroke}`,
  fontSize: 12,
  fontFamily: vars.font.ui,
  fontWeight: 600,
  color: vars.ink,
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.glass.bg,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.accent.primary}`,
      outlineOffset: 1,
    },
  },
});

export const comboboxChevron = style({
  color: vars.muted,
  flexShrink: 0,
  transition: themeTransition,
});

export const comboboxMenu = style({
  maxWidth: 280,
  maxHeight: 280,
  overflow: "auto",
  background: vars.paper,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: 12,
  boxShadow: vars.shadow.panel,
  zIndex: 100,
  padding: 4,
  display: "flex",
  flexDirection: "column",
  gap: 1,
  transition: themeTransition,
});

export const comboboxOption = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 10px",
  borderRadius: 8,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: 12.5,
  fontFamily: vars.font.ui,
  fontWeight: 500,
  color: vars.ink,
  textAlign: "left",
  whiteSpace: "nowrap",
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.glass.bgSoft,
    },
  },
});

export const comboboxOptionActive = style({
  background: vars.glass.bgDeep,
  fontWeight: 700,
});
