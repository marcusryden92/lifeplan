import { style } from "@vanilla-extract/css";
import { vars, themeTransition, interactiveTransition, media, radii } from "@/lib/theme";


export const editor = style({
  display: "flex",
  flexDirection: "column",
  gap: 22,
  padding: "20px 28px 28px",
  overflow: "auto",
  flex: 1,
  minHeight: 0,
  "@media": {
    [media.mobile]: {
      padding: "16px 16px 24px",
      gap: 16,
    },
  },
});

export const header = style({
  display: "flex",
  alignItems: "center",
  gap: 16,
  paddingBottom: 16,
  borderBottom: `1px solid ${vars.rule}`,
  transition: themeTransition,
});

export const headerActions = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexShrink: 0,
});

export const headerSwatch = style({
  width: 52,
  height: 52,
  borderRadius: radii["md+2"],
  border: `1px solid ${vars.glass.stroke}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: vars.font.display,
  fontSize: 24,
  fontWeight: 500,
  color: vars.textOnAccent,
  flexShrink: 0,
  textShadow: "0 1px 2px rgba(0,0,0,0.18)",
});

export const headerInfo = style({
  flex: 1,
  minWidth: 0,
});

// Shared geometry so static â†” edit doesn't shift the surrounding layout.
const NAME_FONT = 30;
const NAME_LINE_HEIGHT = 30;
const NAME_BORDER = 2;

export const headerNameRow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
});

export const headerName = style({
  fontFamily: vars.font.display,
  fontSize: NAME_FONT,
  fontWeight: 500,
  letterSpacing: "-0.025em",
  color: vars.ink,
  lineHeight: `${NAME_LINE_HEIGHT}px`,
  margin: 0,
  padding: 0,
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  height: NAME_LINE_HEIGHT,
  boxSizing: "content-box",
  // Transparent border-bottom reserves the same vertical space the editing
  // input's accent underline occupies, so swapping in/out doesn't pop layout.
  borderBottom: `${NAME_BORDER}px solid transparent`,
  cursor: "text",
  transition: themeTransition,
});

export const headerNameInput = style({
  fontFamily: vars.font.display,
  fontSize: NAME_FONT,
  fontWeight: 500,
  letterSpacing: "-0.025em",
  lineHeight: `${NAME_LINE_HEIGHT}px`,
  color: vars.ink,
  background: "transparent",
  border: "none",
  outline: "none",
  padding: 0,
  margin: 0,
  flex: 1,
  minWidth: 0,
  display: "block",
  boxSizing: "content-box",
  height: NAME_LINE_HEIGHT,
  borderBottom: `${NAME_BORDER}px solid ${vars.accent.primary}`,
});

export const headerNamePencil = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: radii.pill,
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  opacity: 0,
  flexShrink: 0,
  transition: interactiveTransition("opacity", "color", "background-color"),
  selectors: {
    [`${headerNameRow}:hover &`]: { opacity: 1 },
    "&:hover": { color: vars.ink, background: vars.interactive.hoverFill },
    "&:focus-visible": { opacity: 1 },
  },
});

export const headerSummary = style({
  marginTop: 6,
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  color: vars.muted,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const sectionTitle = style({
  fontFamily: vars.font.display,
  fontSize: 17,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  marginBottom: 14,
  transition: themeTransition,
});

export const section = style({
  display: "flex",
  flexDirection: "column",
});

export const sectionPair = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 32,
  "@media": {
    [media.mobile]: { gridTemplateColumns: "1fr", gap: 22 },
  },
});

export const fieldGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px 26px",
  "@media": {
    [media.mobile]: { gridTemplateColumns: "1fr" },
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

export const swatchRow = style({
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
});

export const swatchChip = style({
  width: 22,
  height: 22,
  border: `1.5px solid ${vars.rule}`,
  borderRadius: radii.xs,
  padding: 0,
  cursor: "pointer",
  flexShrink: 0,
  transition: themeTransition,
  selectors: {
    "&:hover": {
      transform: "scale(1.08)",
    },
    "&[data-active='true']": {
      border: `2px solid ${vars.ink}`,
    },
  },
});

export const strictRow = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
});

export const strictToggle = style({
  display: "inline-flex",
  width: 38,
  height: 22,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: radii.pill,
  background: `color-mix(in srgb, ${vars.ink} 6%, transparent)`,
  cursor: "pointer",
  padding: 2,
  alignItems: "center",
  flexShrink: 0,
  transition: themeTransition,
  appearance: "none",
  selectors: {
    "&[data-on='true']": {
      background: vars.ink,
      borderColor: vars.ink,
    },
  },
});

export const strictToggleThumb = style({
  width: 16,
  height: 16,
  borderRadius: "50%",
  background: vars.paper,
  transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  selectors: {
    [`${strictToggle}[data-on='true'] &`]: {
      transform: "translateX(16px)",
    },
  },
});

export const strictLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  fontWeight: 600,
  color: vars.ink,
  transition: themeTransition,
});

export const sectionHelp = style({
  marginTop: 10,
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  color: vars.inkSoft,
  lineHeight: 1.5,
  transition: themeTransition,
});

export const windowsSubsection = style({
  marginBottom: 18,
});

export const subsectionLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
  marginBottom: 8,
  display: "block",
  transition: themeTransition,
});

export const classificationNote = style({
  padding: "14px 16px",
  border: `1px dashed ${vars.rule}`,
  borderRadius: radii.md,
  background: vars.glass.bgSoft,
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  color: vars.inkSoft,
  lineHeight: 1.5,
  transition: themeTransition,
});

export const windowsActions = style({
  display: "flex",
  justifyContent: "flex-end",
  marginTop: 10,
});

export const subCategoriesList = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

export const subCategoryRow = style({
  display: "grid",
  gridTemplateColumns: "14px 1fr 130px 90px",
  alignItems: "center",
  gap: 12,
  "@media": {
    [media.mobile]: { gridTemplateColumns: "14px 1fr auto auto", gap: 8 },
  },
  padding: "8px 12px",
  border: `1px solid ${vars.rule}`,
  borderRadius: radii["sm+2"],
  background: "transparent",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: vars.font.ui,
  fontSize: 13,
  color: vars.ink,
  transition: themeTransition,
  selectors: {
    "&:hover": {
      background: vars.interactive.hoverFill,
      borderColor: vars.glass.stroke,
    },
  },
});

export const subCategoryDot = style({
  width: 9,
  height: 9,
  borderRadius: radii.pill,
  flexShrink: 0,
});

export const subCategoryName = style({
  fontWeight: 600,
  color: vars.ink,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const subCategoryMeta = style({
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  color: vars.muted,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

// Repeated inline-flex layout for combobox option rows (dot/icon + label).
export const inlineRow = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
});

export const inlineRowTight = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
});

export const parentOptionDot = style({
  width: 9,
  height: 9,
  borderRadius: radii.pill,
  flexShrink: 0,
});

export const lockIcon = style({
  color: vars.muted,
  opacity: 0.5,
  selectors: {
    "&[data-on='true']": {
      color: vars.accent.primary,
      opacity: 1,
    },
  },
});

export const subCategoryChevron = style({
  color: vars.muted,
  justifySelf: "end",
});

export const emptyEditor = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  padding: "60px 24px",
  fontFamily: vars.font.ui,
  fontSize: 14,
  color: vars.muted,
  textAlign: "center",
});
