import { style } from "@vanilla-extract/css";
import { vars, themeTransition, backdropFilters } from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

export const page = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
});

export const subHeader = style({
  display: "flex",
  alignItems: "baseline",
  gap: 12,
  padding: "20px 28px 18px",
  flexShrink: 0,
  "@media": {
    [MOBILE]: { padding: "16px 16px 12px", flexWrap: "wrap", gap: 10 },
  },
});

export const pageTitle = style({
  fontFamily: vars.font.display,
  fontSize: 32,
  fontWeight: 500,
  letterSpacing: "-0.03em",
  color: vars.ink,
  lineHeight: 1,
  margin: 0,
  transition: themeTransition,
  "@media": { [MOBILE]: { fontSize: 24 } },
});

export const titleSummary = style({
  fontSize: 12.5,
  color: vars.muted,
  fontWeight: 500,
  fontFamily: vars.font.ui,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const spacer = style({ flex: 1 });

export const userBadge = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontFamily: vars.font.ui,
  fontSize: 11,
  color: vars.muted,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontWeight: 600,
});

export const mainGrid = style({
  display: "grid",
  gridTemplateColumns: "240px 1fr",
  gap: 16,
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

export const subnav = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  paddingRight: 4,
  overflowY: "auto",
  minHeight: 0,
});

export const subnavItem = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid transparent`,
  background: "transparent",
  color: vars.ink,
  fontFamily: vars.font.ui,
  fontSize: 13,
  fontWeight: 500,
  textAlign: "left",
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&:hover": { background: vars.glass.bgSoft },
  },
});

export const subnavItemActive = style({
  background: vars.ink,
  color: vars.paper,
  selectors: {
    "&:hover": { background: vars.ink },
  },
});

export const subnavItemDanger = style({
  color: vars.status.error,
});

export const subnavIcon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  flexShrink: 0,
});

export const content = style({
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
});

export const scrollWrap = style({
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  paddingRight: 16,
  paddingTop: 16,
  paddingBottom: 16,
  display: "flex",
  flexDirection: "column",
  gap: 18,
});

export const sectionHead = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  paddingBottom: 12,
  flexShrink: 0,
});

export const sectionTitle = style({
  fontFamily: vars.font.display,
  fontSize: 28,
  fontWeight: 500,
  letterSpacing: "-0.025em",
  color: vars.ink,
  margin: 0,
  lineHeight: 1.1,
  transition: themeTransition,
});

export const sectionSub = style({
  fontFamily: vars.font.ui,
  fontSize: 12,
  color: vars.muted,
  letterSpacing: "0.04em",
  transition: themeTransition,
});

export const pinstripeRule = style({
  height: 1,
  flexShrink: 0,
  background: vars.rule,
  transition: themeTransition,
});

export const card = style({
  background: vars.glass.bgDeep,
  backdropFilter: backdropFilters.panel,
  WebkitBackdropFilter: backdropFilters.panel,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: 18,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  transition: themeTransition,
  "@media": { [MOBILE]: { padding: 16, borderRadius: 14 } },
});

export const cardTitle = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
  transition: themeTransition,
});

export const fieldGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 12,
  "@media": { [MOBILE]: { gridTemplateColumns: "1fr" } },
});

export const field = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

export const fieldLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
  transition: themeTransition,
});

export const fieldInput = style({
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${vars.rule}`,
  background: vars.glass.bgSoft,
  color: vars.ink,
  fontFamily: vars.font.ui,
  fontSize: 13,
  fontWeight: 500,
  outline: "none",
  transition: themeTransition,
  selectors: {
    "&:focus": { borderColor: vars.ink },
    "&:disabled": { opacity: 0.6, cursor: "not-allowed" },
    "&::placeholder": { color: vars.muted },
  },
});

export const fieldNote = style({
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  color: vars.muted,
  lineHeight: 1.45,
  transition: themeTransition,
});

export const rowSplit = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
});

export const rowGrow = style({ flex: 1, minWidth: 0 });

export const toggleRow = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
});

export const toggleMain = style({ flex: 1, minWidth: 0 });

export const toggleHead = style({
  fontFamily: vars.font.ui,
  fontSize: 13,
  fontWeight: 600,
  color: vars.ink,
  transition: themeTransition,
});

export const toggleBody = style({
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  color: vars.muted,
  marginTop: 2,
  transition: themeTransition,
});

export const toggleSwitch = style({
  position: "relative",
  width: 36,
  height: 20,
  borderRadius: 999,
  border: `1px solid ${vars.rule}`,
  background: vars.glass.bgSoft,
  cursor: "pointer",
  flexShrink: 0,
  padding: 0,
  transition: themeTransition,
});

export const toggleSwitchOn = style({
  background: vars.ink,
  borderColor: vars.ink,
});

export const toggleKnob = style({
  position: "absolute",
  top: 1,
  left: 1,
  width: 16,
  height: 16,
  borderRadius: 999,
  background: vars.paper,
  transition: `transform ${0.18}s ease, background ${0.18}s ease`,
});

export const toggleKnobOn = style({
  transform: "translateX(16px)",
});

export const transportRow = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 6,
});

export const transportBtn = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  padding: "12px 8px",
  borderRadius: 10,
  border: `1px solid ${vars.rule}`,
  background: vars.glass.bgSoft,
  color: vars.ink,
  cursor: "pointer",
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  fontWeight: 500,
  transition: themeTransition,
  selectors: {
    "&:hover": { background: vars.glass.bgDeep },
  },
});

export const transportBtnActive = style({
  background: vars.ink,
  color: vars.paper,
  borderColor: vars.ink,
  selectors: {
    "&:hover": { background: vars.ink },
  },
});

export const providerRow = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${vars.rule}`,
  background: "transparent",
  transition: themeTransition,
});

export const providerIcon = style({
  width: 28,
  height: 28,
  borderRadius: 8,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: vars.glass.bgSoft,
  color: vars.ink,
  flexShrink: 0,
  transition: themeTransition,
});

export const providerMain = style({ flex: 1, minWidth: 0 });

export const providerName = style({
  fontFamily: vars.font.ui,
  fontSize: 13,
  fontWeight: 600,
  color: vars.ink,
  transition: themeTransition,
});

export const providerStatus = style({
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  color: vars.muted,
  transition: themeTransition,
});

export const footerRow = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  justifyContent: "flex-end",
});

export const footerMessage = style({
  flex: 1,
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  color: vars.muted,
});

export const footerMessageSuccess = style({
  color: vars.status.success,
});

export const footerMessageError = style({
  color: vars.status.error,
});

export const comingSoon = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "48px 24px",
  textAlign: "center",
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontSize: 13,
  gap: 6,
});

export const comingSoonTitle = style({
  fontFamily: vars.font.display,
  fontSize: 18,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  transition: themeTransition,
});

export const dangerNote = style({
  padding: "12px 14px",
  borderRadius: 10,
  border: `1px solid ${vars.status.error}`,
  background: vars.glass.bgSoft,
  color: vars.status.error,
  fontFamily: vars.font.ui,
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1.45,
  transition: themeTransition,
});
