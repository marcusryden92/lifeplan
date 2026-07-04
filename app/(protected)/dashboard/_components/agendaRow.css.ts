import { style } from "@vanilla-extract/css";
import { vars, themeTransition, radii } from "@/lib/theme";

// Row primitives shared by AgendaItemRow and UncompletedItemRow. Variants
// (NOW/NEXT/TRAVEL, flash tints) live in the respective row files.
export const agendaRow = style({
  display: "grid",
  gridTemplateColumns: "72px 1fr auto",
  gap: 14,
  alignItems: "baseline",
  padding: "10px 12px",
  margin: "4px 12px",
  borderRadius: radii["md+2"],
  cursor: "pointer",
  background: "transparent",
  border: "1px solid transparent",
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.interactive.hoverFill,
    },
  },
});

export const agendaRowGrouped = style({
  margin: "2px 12px",
});

export const agendaTimeCol = style({
  fontFamily: vars.font.ui,
  fontVariantNumeric: "tabular-nums",
});

export const agendaTime = style({
  fontSize: 13.5,
  fontWeight: 700,
  color: vars.ink,
  letterSpacing: "0.02em",
  transition: themeTransition,
});

export const agendaDur = style({
  fontSize: 11,
  color: vars.muted,
  marginTop: 2,
  fontWeight: 600,
  transition: themeTransition,
});

export const agendaTitle = style({
  fontFamily: vars.font.display,
  fontSize: 16,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  transition: themeTransition,
});

export const agendaMeta = style({
  marginTop: 4,
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
});

export const agendaMetaDimmer = style({
  color: vars.muted,
});
