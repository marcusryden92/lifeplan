import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

export const card = style({
  display: "flex",
  flexDirection: "column",
});

export const cardHeader = style({
  padding: "12px 0",
  borderBottom: `1px solid ${vars.rule}`,
  transition: themeTransition,
});

export const cardTitle = style({
  fontFamily: vars.font.display,
  fontSize: 17,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  transition: themeTransition,
});

export const cardBody = style({
  padding: "16px 0",
});

export const fieldGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px 26px",
  "@media": {
    [MOBILE]: { gridTemplateColumns: "1fr" },
  },
});

export const fieldStack = style({
  display: "flex",
  flexDirection: "column",
  gap: 7,
  minWidth: 0,
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

export const fieldValue = style({
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  fontWeight: 600,
  color: vars.ink,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const typePicker = style({
  display: "inline-flex",
  padding: 3,
  borderRadius: 999,
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  gap: 2,
  alignSelf: "flex-start",
});

export const typePickerBtn = style({
  border: "none",
  background: "transparent",
  padding: "5px 14px",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 11,
  fontFamily: vars.font.ui,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: vars.muted,
  transition: themeTransition,
});

export const typePickerBtnActive = style({
  background: vars.ink,
  color: vars.paper,
});

export const priorityRow = style({
  display: "flex",
  gap: 3,
});

export const priorityPill = style({
  flex: 1,
  border: `1px solid ${vars.glass.stroke}`,
  background: "transparent",
  padding: "5px 0",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 11.5,
  fontFamily: vars.font.ui,
  fontWeight: 700,
  color: vars.inkSoft,
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
  selectors: {
    "&:hover": { color: vars.ink, borderColor: vars.rule },
  },
});

export const priorityPillActive = style({
  background: vars.ink,
  color: vars.paper,
  borderColor: vars.ink,
});

export const numberInput = style({
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: 10,
  padding: "8px 12px",
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  color: vars.ink,
  outline: "none",
  width: "100%",
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
  selectors: {
    "&:focus": {
      borderColor: vars.accent.primary,
    },
  },
});

export const dateInput = style({
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: 10,
  padding: "8px 12px",
  fontFamily: vars.font.ui,
  fontSize: 13,
  color: vars.ink,
  outline: "none",
  fontVariantNumeric: "tabular-nums",
  width: "100%",
  colorScheme: "light dark",
  transition: themeTransition,
  selectors: {
    "&:focus": {
      borderColor: vars.accent.primary,
    },
  },
});

export const placeRow = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
});

export const overrideToggle = style({
  border: `1px solid ${vars.glass.stroke}`,
  background: "transparent",
  borderRadius: 999,
  padding: "3px 10px",
  fontSize: 10,
  fontFamily: vars.font.ui,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: vars.muted,
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&:hover": { color: vars.ink, borderColor: vars.rule },
    "&[aria-pressed='true']": {
      background: vars.ink,
      borderColor: vars.ink,
      color: vars.paper,
    },
  },
});

export const inheritedHint = style({
  marginTop: -2,
});
