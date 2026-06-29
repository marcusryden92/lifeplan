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

export const agendaTitleTravel = style({
  color: vars.muted,
  fontStyle: "italic",
});

// Floating label sitting above a NOW / NEXT row, aligned with the row's
// inner gutter so it visually anchors to the colored item card below it.
export const rowLabel = style({
  display: "flex",
  margin: "12px 24px 6px",
  fontFamily: vars.font.ui,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.12em",
  transition: themeTransition,
});

export const rowLabelNow = style({ color: vars.accent.now });
export const rowLabelNext = style({ color: vars.status.warning });

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
  alignSelf: "center",
  transition: themeTransition,
});
