import { style } from "@vanilla-extract/css";
import {
  vars,
  themeTransition,
  backdropFilters,
  glass,
} from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

export const leftCard = style([
  glass({ fill: "regular", radius: "lg", shadow: "panel" }),
  {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
    "@media": {
      [MOBILE]: {
        minHeight: "auto",
        overflow: "visible",
      },
    },
  },
]);

export const leftCardHeader = style({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
  padding: "16px 20px",
  borderTopLeftRadius: 22,
  borderTopRightRadius: 22,
  borderBottom: `1px solid ${vars.glass.stroke}`,
  background: vars.glass.bgDeep,
  backdropFilter: backdropFilters.panel,
  WebkitBackdropFilter: backdropFilters.panel,
  boxShadow: `inset 0 1px 0 ${vars.glass.hi}`,
  transform: "translateZ(0)",
  willChange: "backdrop-filter",
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 12,
  transition: themeTransition,
  "@media": {
    [MOBILE]: {
      position: "relative",
      top: "auto",
    },
  },
});

export const leftCardTitle = style({
  fontFamily: vars.font.display,
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  margin: 0,
  transition: themeTransition,
});

export const agendaList = style({
  flex: 1,
  overflow: "auto",
  isolation: "isolate",
  paddingTop: 78,
  marginBottom: 8,
  selectors: {
    "&::-webkit-scrollbar": {
      width: 7,
    },
    "&::-webkit-scrollbar-thumb": {
      borderWidth: 1,
    },
  },
  "@media": {
    [MOBILE]: {
      flex: "0 0 auto",
      overflow: "visible",
      marginTop: 0,
      marginBottom: 0,
    },
  },
});

export const agendaRows = style({
  padding: "22px 28px 24px",
});

export const agendaEmpty = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 160,
  color: vars.muted,
});

// Top-level dashboard sections (UNCOMPLETED, TODAY). Bigger format than the
// per-(type+category) group dividers so the eye lands on the section first,
// then the group sub-headers inside. Distinct visual weight clears up the
// "is this a section or just another group?" ambiguity.
export const agendaSection = style({
  marginTop: 14,
  ":first-child": {
    marginTop: 0,
  },
});

export const agendaSectionHeader = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 0",
  marginLeft: 12,
  marginRight: 12,
  marginBottom: 14,
});

export const agendaSectionHeaderText = style({
  fontFamily: vars.font.display,
  fontSize: 18,
  fontWeight: 500,
  letterSpacing: "-0.01em",
  color: vars.ink,
  transition: themeTransition,
});

export const agendaSectionHeaderCount = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  color: vars.muted,
  transition: themeTransition,
});

export const agendaGroup = style({
  margin: "8px 0",
});

export const agendaGroupHeader = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "10px 0 6px",
  marginLeft: 12,
  marginRight: 12,
  borderBottom: `1px solid ${vars.rule}`,
  marginBottom: 10,
});

export const agendaGroupHeaderText = style({
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: vars.muted,
  transition: themeTransition,
});

// Shared row primitives — used by both AgendaItemRow and UncompletedItemRow.
// Variants (NOW/NEXT/TRAVEL flash etc.) live in the respective row files.
export const agendaRow = style({
  display: "grid",
  gridTemplateColumns: "72px 1fr auto",
  gap: 14,
  alignItems: "center",
  padding: "10px 12px",
  margin: "4px 12px",
  borderRadius: 14,
  cursor: "pointer",
  background: "transparent",
  border: "1px solid transparent",
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.glass.bgSoft,
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
