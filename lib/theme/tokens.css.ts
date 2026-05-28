import { createThemeContract } from "@vanilla-extract/css";

export const vars = createThemeContract({
  paper: null,
  bezel: null,
  ink: null,
  inkSoft: null,
  muted: null,
  rule: null,

  glass: {
    bg: null,
    bgDeep: null,
    bgSoft: null,
    stroke: null,
    hi: null,
  },

  shadow: {
    panel: null,
    panelSm: null,
  },

  noise: {
    opacity: null,
    blend: null,
  },

  accent: {
    primary: null,
    now: null,
    done: null,
    secondary: null,
  },

  status: {
    success: null,
    warning: null,
    error: null,
    info: null,
  },

  swatches: {
    blue: null,
    green: null,
    violet: null,
    indigo: null,
    cyan: null,
    amber: null,
    rose: null,
    teal: null,
  },

  font: {
    display: null,
    ui: null,
  },
});

export type ThemeVars = typeof vars;
