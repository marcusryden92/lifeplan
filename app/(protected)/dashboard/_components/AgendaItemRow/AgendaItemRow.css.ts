import { style } from "@vanilla-extract/css";
import { vars, themeTransition, colorMixAlpha } from "@/lib/theme";

export const agendaRowNow = style({
  background: `color-mix(in srgb, ${vars.accent.now} ${colorMixAlpha.lightFill}%, transparent)`,
  border: `1px solid color-mix(in srgb, ${vars.accent.now} 45%, transparent)`,
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${vars.accent.now} ${colorMixAlpha.lightFill}%, transparent)`,
    },
  },
});

export const agendaRowNext = style({
  background: `color-mix(in srgb, ${vars.status.warning} ${colorMixAlpha.lightFill}%, transparent)`,
  border: `1px solid color-mix(in srgb, ${vars.status.warning} 45%, transparent)`,
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${vars.status.warning} ${colorMixAlpha.lightFill}%, transparent)`,
    },
  },
});

export const agendaRowTravel = style({
  cursor: "default",
  selectors: {
    "&:hover": {
      background: "transparent",
    },
  },
});

export const agendaTimeNow = style({
  color: vars.accent.now,
});

export const agendaTimeNext = style({
  color: vars.status.warning,
});

export const agendaTitleTravel = style({
  color: vars.muted,
  fontStyle: "italic",
});

export const agendaWarn = style({
  fontSize: 10,
  fontWeight: 700,
  color: vars.status.warning,
  letterSpacing: "0.08em",
  fontFamily: vars.font.ui,
});

export const agendaOverdue = style({
  fontSize: 10,
  fontWeight: 700,
  color: vars.status.error,
  letterSpacing: "0.08em",
  fontFamily: vars.font.ui,
});

export const agendaChevron = style({
  color: vars.muted,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: themeTransition,
});
