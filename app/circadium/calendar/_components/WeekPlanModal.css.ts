import { style, globalStyle } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

// Modal fade duration in ms — used by both CSS transition and the JS unmount timer.
export const MODAL_FADE_MS = 220;

export const overlay = style({
  position: "absolute",
  inset: 0,
  zIndex: 10,
  display: "flex",
  opacity: 0,
  transition: `opacity ${MODAL_FADE_MS}ms ease`,
  selectors: {
    "&[data-state='open']": {
      opacity: 1,
    },
  },
});

export const modal = style({
  position: "relative",
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  padding: 0,
  background: vars.paper,
  opacity: 0,
  transform: "translateY(8px) scale(0.995)",
  transition: `${themeTransition}, opacity ${MODAL_FADE_MS}ms ease, transform ${MODAL_FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  selectors: {
    [`${overlay}[data-state='open'] &`]: {
      opacity: 1,
      transform: "translateY(0) scale(1)",
    },
  },
});

export const banner = style({
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "14px 20px",
  borderBottom: `1px solid ${vars.rule}`,
  background: `color-mix(in srgb, ${vars.ink} 4%, transparent)`,
  transition: themeTransition,
});

export const editingLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
  transition: themeTransition,
});

export const modeToggle = style({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  padding: 3,
  borderRadius: 999,
  background: `color-mix(in srgb, ${vars.ink} 6%, transparent)`,
  border: `1px solid ${vars.rule}`,
});

export const modeToggleThumb = style({
  position: "absolute",
  top: 3,
  bottom: 3,
  left: 3,
  width: "calc(50% - 3px)",
  borderRadius: 999,
  background: vars.ink,
  transition: "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
  zIndex: 0,
  selectors: {
    "&[data-position='1']": {
      transform: "translateX(100%)",
    },
  },
});

export const modeToggleButton = style({
  position: "relative",
  zIndex: 1,
  appearance: "none",
  border: "none",
  background: "transparent",
  padding: "5px 18px",
  borderRadius: 999,
  fontFamily: vars.font.ui,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.04em",
  color: vars.muted,
  cursor: "pointer",
  transition: `color 0.22s cubic-bezier(0.4, 0, 0.2, 1)`,
  selectors: {
    "&[data-active='true']": {
      color: vars.paper,
    },
    "&:hover:not([data-active='true'])": {
      color: vars.ink,
    },
  },
});

export const bannerSummary = style({
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  fontWeight: 500,
  color: vars.inkSoft,
  fontVariantNumeric: "tabular-nums",
});

export const bannerSpacer = style({ flex: 1 });

export const body = style({
  flex: 1,
  display: "flex",
  minHeight: 0,
  overflow: "hidden",
});

export const gridCol = style({
  position: "relative",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  minWidth: 0,
  padding: "14px 18px",
  borderRight: `1px solid ${vars.rule}`,
});

export const gridHeader = style({
  display: "flex",
  alignItems: "baseline",
  gap: 12,
  marginBottom: 8,
  flexShrink: 0,
});

export const gridTitle = style({
  fontFamily: vars.font.display,
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  margin: 0,
  transition: themeTransition,
});

export const gridSubtitle = style({
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  color: vars.inkSoft,
  fontVariantNumeric: "tabular-nums",
});

export const calendarWrap = style({
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  borderRadius: 14,
  border: `1px solid ${vars.rule}`,
});

export const rail = style({
  width: 320,
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
});

export const selectedPanel = style({
  flexShrink: 0,
  padding: "16px 18px",
  borderBottom: `1px solid ${vars.rule}`,
  background: `color-mix(in srgb, ${vars.ink} 3%, transparent)`,
});

export const emptyPanel = style({
  flexShrink: 0,
  padding: "18px 18px",
  borderBottom: `1px solid ${vars.rule}`,
  fontFamily: vars.font.ui,
  fontSize: 12,
  color: vars.muted,
  lineHeight: 1.5,
});

export const selectedHeaderRow = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 10,
});

export const selectedSwatch = style({
  width: 10,
  height: 10,
  borderRadius: 999,
  flexShrink: 0,
  boxShadow: `0 0 0 1px color-mix(in srgb, ${vars.ink} 14%, transparent)`,
});

export const selectedTitle = style({
  fontFamily: vars.font.display,
  fontSize: 18,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const fieldGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  marginBottom: 8,
});

export const field = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

export const fieldLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
});

export const fieldInput = style({
  appearance: "none",
  border: `1px solid ${vars.rule}`,
  background: vars.paper,
  padding: "6px 10px",
  borderRadius: 8,
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  color: vars.ink,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
  selectors: {
    "&:focus": {
      outline: "none",
      borderColor: `color-mix(in srgb, ${vars.accent.primary} 60%, ${vars.rule})`,
    },
  },
});

export const fieldStatic = style({
  padding: "6px 0",
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  fontWeight: 500,
  color: vars.ink,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
});

export const dayPicker = style({
  display: "flex",
  gap: 4,
  flexWrap: "wrap",
});

export const dayChip = style({
  appearance: "none",
  border: `1px solid ${vars.rule}`,
  background: "transparent",
  padding: "4px 9px",
  borderRadius: 999,
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.08em",
  color: vars.muted,
  cursor: "pointer",
  transition: themeTransition,
  selectors: {
    "&[data-active='true']": {
      background: vars.ink,
      borderColor: vars.ink,
      color: vars.paper,
    },
  },
});

export const swatchRow = style({
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
});

export const swatchChip = style({
  width: 22,
  height: 22,
  borderRadius: 6,
  cursor: "pointer",
  border: `1px solid ${vars.rule}`,
  padding: 0,
  selectors: {
    "&[data-active='true']": {
      boxShadow: `0 0 0 2px ${vars.ink}`,
    },
  },
});

export const categoryRow = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  maxHeight: 140,
  overflow: "auto",
  border: `1px solid ${vars.rule}`,
  borderRadius: 8,
  padding: 4,
});

export const categoryOption = style({
  appearance: "none",
  border: "none",
  background: "transparent",
  padding: "5px 8px",
  borderRadius: 6,
  fontFamily: vars.font.ui,
  fontSize: 12,
  color: vars.ink,
  display: "flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${vars.ink} 6%, transparent)`,
    },
    "&[data-active='true']": {
      background: `color-mix(in srgb, ${vars.accent.primary} 14%, transparent)`,
      color: vars.ink,
      fontWeight: 600,
    },
  },
});

export const categoryDot = style({
  width: 8,
  height: 8,
  borderRadius: 999,
  flexShrink: 0,
});

export const selectedActions = style({
  display: "flex",
  gap: 6,
  marginTop: 10,
  flexWrap: "wrap",
});

export const listSection = style({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  padding: "12px 14px",
});

export const listHeader = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
  marginBottom: 8,
});

export const listItems = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

export const listItem = style({
  appearance: "none",
  border: `1px solid ${vars.rule}`,
  background: "transparent",
  padding: "8px 10px",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontFamily: vars.font.ui,
  color: vars.ink,
  textAlign: "left",
  cursor: "pointer",
  transition: themeTransition,
  width: "100%",
  selectors: {
    "&:hover": {
      borderColor: `color-mix(in srgb, ${vars.ink} 24%, ${vars.rule})`,
    },
    "&[data-active='true']": {
      background: vars.ink,
      borderColor: vars.ink,
      color: vars.paper,
    },
  },
});

export const listItemSwatch = style({
  width: 10,
  height: 10,
  borderRadius: 999,
  flexShrink: 0,
  boxShadow: `0 0 0 1px color-mix(in srgb, ${vars.ink} 18%, transparent)`,
});

export const listItemBody = style({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 2,
});

export const listItemTitle = style({
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "-0.005em",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const listItemSub = style({
  fontSize: 10.5,
  fontWeight: 500,
  letterSpacing: "0.04em",
  fontVariantNumeric: "tabular-nums",
  color: "inherit",
  opacity: 0.7,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const errorBanner = style({
  margin: "0 18px 12px",
  padding: "10px 14px",
  borderRadius: 10,
  border: `1px solid color-mix(in srgb, ${vars.status.error} 60%, transparent)`,
  background: `color-mix(in srgb, ${vars.status.error} 12%, transparent)`,
  color: vars.ink,
  fontFamily: vars.font.ui,
  fontSize: 12,
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
});

export const errorDismiss = style({
  appearance: "none",
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  padding: 0,
  display: "inline-flex",
});

export const loadingState = style({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontSize: 13,
});

const FC = ".week-plan-fc";

globalStyle(`${FC}`, {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
});

globalStyle(`${FC} .fc`, {
  fontFamily: vars.font.ui,
  flex: 1,
  minHeight: 0,
});

globalStyle(`${FC} .fc-scrollgrid`, {
  border: "none !important",
  background: "transparent !important",
});

globalStyle(
  `${FC} .fc-theme-standard td, ${FC} .fc-theme-standard th, ${FC} .fc-theme-standard .fc-scrollgrid`,
  { borderColor: `${vars.rule} !important` },
);

globalStyle(`${FC} .fc-media-screen`, {
  border: "none !important",
  borderRadius: "0 !important",
});

globalStyle(`${FC} .fc-col-header`, {
  background: `color-mix(in srgb, ${vars.ink} 3%, transparent)`,
});

globalStyle(`${FC} .fc-col-header-cell`, {
  borderColor: `${vars.rule} !important`,
  padding: "8px 0",
});

globalStyle(`${FC} .fc-col-header-cell-cushion`, {
  textDecoration: "none",
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
});

globalStyle(`${FC} .fc-timegrid-axis-cushion`, {
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  fontWeight: 600,
  color: vars.muted,
  fontVariantNumeric: "tabular-nums",
});

globalStyle(`${FC} .fc-timegrid-slot-label-cushion`, {
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  fontWeight: 600,
  color: vars.muted,
  fontVariantNumeric: "tabular-nums",
  padding: "0 8px",
});

globalStyle(`${FC} .fc-timegrid-slot`, {
  height: "2.2rem !important",
  borderColor: `${vars.rule} !important`,
});

globalStyle(`${FC} .fc-timegrid-col`, {
  background: "transparent !important",
});

globalStyle(`${FC} .fc-event`, {
  border: "none !important",
  borderRadius: "0 !important",
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "none !important",
  background: "transparent !important",
  transition: themeTransition,
});

globalStyle(`${FC} .fc-event-main`, {
  padding: "0 !important",
  background: "transparent !important",
});

globalStyle(`${FC} .fc-v-event`, { border: "none !important" });

globalStyle(`${FC} .fc-timegrid-event-harness`, { border: 0 });

globalStyle(`${FC} .fc-scroller`, {
  overflow: "auto !important",
  scrollbarWidth: "none",
});

globalStyle(`${FC} .fc-scroller::-webkit-scrollbar`, {
  width: 0,
  height: 0,
  background: "transparent",
});

globalStyle(
  [
    `${FC} .fc-scrollgrid-sync-table`,
    `${FC} table.fc-col-header`,
    `${FC} .fc-timegrid-body`,
    `${FC} .fc-timegrid-slots`,
    `${FC} .fc-timegrid-slots > table`,
    `${FC} .fc-timegrid-cols`,
    `${FC} .fc-timegrid-cols > table`,
  ].join(", "),
  { width: "100% !important" },
);

globalStyle(`${FC} .fc-timegrid-axis`, {
  borderColor: `${vars.rule} !important`,
});

export const eventBox = style({
  height: "100%",
  width: "100%",
  padding: "3px 6px",
  fontFamily: vars.font.ui,
  fontSize: 11,
  lineHeight: 1.15,
  color: vars.ink,
  overflow: "hidden",
  borderRadius: 4,
  position: "relative",
  outline: "1.5px solid transparent",
  outlineOffset: -1,
  transition: `opacity ${MODAL_FADE_MS}ms ease, filter ${MODAL_FADE_MS}ms ease, outline-color 150ms ease, ${themeTransition}`,
  selectors: {
    "&[data-kind='template']": {
      color: "#fff",
    },
    "&[data-kind='window'][data-assigned='true']": {
      color: "#fff",
    },
    "&[data-inactive='true']": {
      opacity: 0.22,
      filter: "saturate(0.7)",
      pointerEvents: "none",
    },
    // Windows belonging to non-focused categories, dimmed but still clickable
    // when the modal is opened from a per-area context (Life Areas page).
    "&[data-defocused='true']": {
      opacity: 0.32,
      filter: "saturate(0.6)",
    },
    "&[data-selected='true']": {
      outlineColor: vars.status.error,
    },
  },
});

export const eventTitle = style({
  fontWeight: 700,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
});

export const eventTime = style({
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.04em",
  opacity: 0.85,
  fontVariantNumeric: "tabular-nums",
});
