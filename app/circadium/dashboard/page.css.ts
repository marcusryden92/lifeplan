import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

export const page = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
  "@media": {
    [MOBILE]: {
      flex: "0 0 auto",
      minHeight: "auto",
    },
  },
});

export const headerRow = style({
  padding: "30px 32px 22px",
  flexShrink: 0,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 24,
  "@media": {
    [MOBILE]: {
      padding: "22px 18px 16px",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 14,
    },
  },
});

export const greeting = style({
  fontFamily: vars.font.display,
  fontSize: 56,
  fontWeight: 500,
  letterSpacing: "-0.045em",
  lineHeight: 0.98,
  color: vars.ink,
  margin: 0,
  transition: themeTransition,
  "@media": {
    [MOBILE]: { fontSize: 38 },
  },
});

export const summaryLine = style({
  marginTop: 10,
  fontSize: 14,
  color: vars.inkSoft,
  fontWeight: 500,
  fontFamily: vars.font.ui,
  transition: themeTransition,
});

export const summaryStrong = style({
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
  color: vars.ink,
  transition: themeTransition,
});

export const summaryError = style({
  color: vars.status.error,
  fontWeight: 600,
  transition: themeTransition,
});

export const headerActions = style({
  display: "flex",
  gap: 8,
  flexShrink: 0,
  "@media": {
    [MOBILE]: { width: "100%" },
  },
});

export const gridWrap = style({
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr",
  gap: 18,
  padding: "0 28px 28px",
  flex: 1,
  minHeight: 0,
  "@media": {
    [MOBILE]: {
      gridTemplateColumns: "1fr",
      padding: "0 16px 24px",
      gap: 14,
      flex: "0 0 auto",
      minHeight: "auto",
    },
  },
});

export const leftCard = style({
  background: vars.glass.bg,
  border: `1px solid ${vars.glass.stroke}`,
  boxShadow: vars.shadow.panel,
  borderRadius: 22,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
  transition: themeTransition,
  "@media": {
    [MOBILE]: {
      minHeight: "auto",
      overflow: "visible",
    },
  },
});

export const leftCardHeader = style({
  position: "sticky",
  top: 0,
  zIndex: 1,
  padding: "16px 20px",
  borderTopLeftRadius: 22,
  borderTopRightRadius: 22,
  borderBottom: `1px solid ${vars.glass.stroke}`,
  background: vars.glass.bgDeep,
  backdropFilter: "blur(28px) saturate(180%)",
  WebkitBackdropFilter: "blur(28px) saturate(180%)",
  boxShadow: `inset 0 1px 0 ${vars.glass.hi}`,
  transform: "translateZ(0)",
  willChange: "backdrop-filter",
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 12,
  transition: themeTransition,
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
  scrollbarWidth: "none",
  selectors: {
    "&::-webkit-scrollbar": { display: "none" },
  },
  "@media": {
    [MOBILE]: {
      flex: "0 0 auto",
      overflow: "visible",
    },
  },
});

export const agendaRows = style({
  padding: "12px 12px 12px",
});

export const agendaRow = style({
  display: "grid",
  gridTemplateColumns: "72px 1fr auto",
  gap: 14,
  alignItems: "center",
  padding: "10px 12px",
  margin: "4px 0",
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

export const agendaRowNow = style({
  background: `color-mix(in srgb, ${vars.accent.now} 14%, transparent)`,
  border: `1px solid color-mix(in srgb, ${vars.accent.now} 45%, transparent)`,
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${vars.accent.now} 18%, transparent)`,
    },
  },
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

export const agendaTimeNow = style({
  color: vars.accent.now,
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

export const agendaTitleTravel = style({
  color: vars.muted,
  fontStyle: "italic",
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

export const rightCol = style({
  display: "flex",
  flexDirection: "column",
  gap: 14,
  minHeight: 0,
  scrollbarWidth: "none",
  selectors: {
    "&::-webkit-scrollbar": { display: "none" },
  },
});

export const goalsCard = style({
  padding: "16px 20px",
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  "@media": {
    [MOBILE]: {
      flex: "0 0 auto",
      minHeight: "auto",
    },
  },
});

export const goalsHeader = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  marginBottom: 8,
});

export const goalsTitle = style({
  fontFamily: vars.font.display,
  fontSize: 19,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  margin: 0,
  transition: themeTransition,
});

export const goalRow = style({
  padding: "12px 0",
  cursor: "pointer",
  selectors: {
    "&:not(:first-child)": {
      borderTop: `1px solid ${vars.rule}`,
    },
  },
});

export const goalHead = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

export const goalName = style({
  fontFamily: vars.font.display,
  fontSize: 16,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  flex: 1,
  color: vars.ink,
  transition: themeTransition,
});

export const goalFraction = style({
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  fontWeight: 700,
  color: vars.inkSoft,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const goalTrack = style({
  marginTop: 8,
  height: 6,
  borderRadius: 999,
  background: `color-mix(in srgb, ${vars.ink} 10%, transparent)`,
  position: "relative",
  overflow: "hidden",
});

export const goalFill = style({
  position: "absolute",
  inset: 0,
  borderRadius: 999,
});

export const goalFooter = style({
  marginTop: 7,
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 10,
});

export const goalNext = style({
  fontSize: 12,
  color: vars.inkSoft,
  fontFamily: vars.font.ui,
  fontWeight: 500,
  transition: themeTransition,
});
