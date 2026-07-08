import { style } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  backdropFilters,
  media,
  radii,
  glass,
  display,
  text,
  fieldLabel,
} from "@/lib/theme";

// blur:"pseudo" lets leftCardHeader keep its own backdrop-filter sample of
// the scrolling list; its isolation also contains the header's zIndex:100.
export const leftCard = style([
  glass({ radius: "lg", blur: "pseudo" }),
  {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
    "@media": {
      [media.mobile]: {
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
  borderTopLeftRadius: radii["xl+2"],
  borderTopRightRadius: radii["xl+2"],
  borderBottom: `1px solid ${vars.glass.stroke}`,
  background: vars.glass.bgDeep,
  backdropFilter: backdropFilters.panel,
  WebkitBackdropFilter: backdropFilters.panel,
  boxShadow: `inset 0 1px 0 ${vars.glass.hi}`,
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: space["3"],
  transition: themeTransition,
  "@media": {
    [media.mobile]: {
      position: "relative",
      top: "auto",
    },
  },
});

export const leftCardTitle = style([
  display.modalTitle,
  {
    color: vars.ink,
    margin: 0,
    transition: themeTransition,
  },
]);

export const agendaList = style({
  flex: 1,
  overflow: "auto",
  paddingTop: space["20"],
  marginBottom: space["2"],
  selectors: {
    "&::-webkit-scrollbar": {
      width: 7,
    },
    "&::-webkit-scrollbar-thumb": {
      borderWidth: 1,
    },
  },
  "@media": {
    [media.mobile]: {
      flex: "0 0 auto",
      overflow: "visible",
      paddingTop: 0,
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
  marginTop: space["3.5"],
  ":first-child": {
    marginTop: 0,
  },
});

export const agendaSectionHeader = style({
  display: "flex",
  alignItems: "center",
  gap: space["2.5"],
  padding: "10px 0",
  marginLeft: space["3"],
  marginRight: space["3"],
  marginBottom: space["3.5"],
});

export const agendaSectionHeaderText = style([
  display.panelTitle,
  {
    color: vars.ink,
    transition: themeTransition,
  },
]);

export const agendaSectionHeaderCount = style([
  text.microLabel,
  {
    fontWeight: 600,
    letterSpacing: "0.04em",
    color: vars.muted,
    transition: themeTransition,
  },
]);

export const agendaGroup = style({
  margin: "8px 0",
});

export const agendaGroupHeader = style({
  display: "flex",
  alignItems: "center",
  gap: space["1.5"],
  padding: "10px 0 6px",
  marginLeft: space["3"],
  marginRight: space["3"],
  borderBottom: `1px solid ${vars.rule}`,
  marginBottom: space["2.5"],
});

export const agendaGroupHeaderText = style([
  fieldLabel,
  {
    transition: themeTransition,
  },
]);
