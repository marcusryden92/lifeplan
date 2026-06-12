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
  position: "relative",
  display: "inline-grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  padding: 3,
  borderRadius: 999,
  background: `color-mix(in srgb, ${vars.ink} 6%, transparent)`,
  border: `1px solid ${vars.rule}`,
  alignSelf: "flex-start",
});

export const typePickerThumb = style({
  position: "absolute",
  top: 3,
  bottom: 3,
  left: 3,
  width: "calc(33.333% - 2px)",
  borderRadius: 999,
  background: vars.ink,
  transition: "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
  zIndex: 0,
  selectors: {
    "&[data-position='1']": { transform: "translateX(100%)" },
    "&[data-position='2']": { transform: "translateX(200%)" },
  },
});

export const typePickerBtn = style({
  position: "relative",
  zIndex: 1,
  appearance: "none",
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
  transition: "color 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
  selectors: {
    "&[data-active='true']": { color: vars.paper },
    "&:hover:not([data-active='true'])": { color: vars.ink },
  },
});

export const priorityRow = style({
  display: "flex",
  gap: 3,
  flexWrap: "nowrap",
});

export const priorityPill = style({
  flex: "0 0 auto",
  width: 22,
  height: 22,
  border: `1px solid ${vars.glass.stroke}`,
  background: "transparent",
  padding: 0,
  borderRadius: "50%",
  cursor: "pointer",
  fontSize: 11,
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
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 500,
  color: vars.muted,
  // Allows the hint to wrap inside the place cell when the category name is
  // long, instead of overflowing into the column on the right.
  minWidth: 0,
  overflowWrap: "anywhere",
});

// Pulls ghost-size-sm buttons flush-left under the field grid by negating the
// button's internal left padding (pillBtn sm = padding: 6px 14px).
export const flushLeftBtn = style({
  marginLeft: -14,
});

export const deleteRow = style({
  display: "flex",
  justifyContent: "flex-start",
  marginTop: 20,
  paddingTop: 16,
  borderTop: `1px solid ${vars.rule}`,
  transition: themeTransition,
});
