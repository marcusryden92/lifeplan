import { style, globalStyle } from "@vanilla-extract/css";
import { vars, themeTransition, radii } from "@/lib/theme";

// Modal fade duration in ms â€” used by both CSS transition and the JS unmount timer.
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
  position: "absolute",
  inset: 0,
  zIndex: 11,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  isolation: "isolate",
  padding: 0,
  background: vars.paper,
  opacity: 0,
  transform: "translateY(8px) scale(0.995)",
  transition: `${themeTransition}, opacity ${MODAL_FADE_MS}ms ease, transform ${MODAL_FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  selectors: {
    "&[data-state='open']": {
      opacity: 1,
      transform: "translateY(0) scale(1)",
    },
  },
});

export const banner = style({
  position: "relative",
  zIndex: 1,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "8px 22px",
  background: vars.ink,
  color: vars.paper,
  transition: themeTransition,
});

export const editingLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: `color-mix(in srgb, ${vars.paper} 65%, transparent)`,
  transition: themeTransition,
});

export const modeToggle = style({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  padding: 3,
  borderRadius: radii.pill,
  background: `color-mix(in srgb, ${vars.paper} 10%, transparent)`,
  border: `1px solid color-mix(in srgb, ${vars.paper} 18%, transparent)`,
});

export const modeToggleThumb = style({
  position: "absolute",
  top: 3,
  bottom: 3,
  left: 3,
  width: "calc(50% - 3px)",
  borderRadius: radii.pill,
  background: vars.paper,
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
  borderRadius: radii.pill,
  fontFamily: vars.font.ui,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.04em",
  color: `color-mix(in srgb, ${vars.paper} 70%, transparent)`,
  cursor: "pointer",
  transition: `color 0.22s cubic-bezier(0.4, 0, 0.2, 1)`,
  selectors: {
    "&[data-active='true']": {
      color: vars.ink,
    },
    "&:hover:not([data-active='true'])": {
      color: vars.paper,
    },
  },
});

export const bannerSummary = style({
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  fontWeight: 500,
  color: `color-mix(in srgb, ${vars.paper} 72%, transparent)`,
  fontVariantNumeric: "tabular-nums",
});

export const bannerSpacer = style({ flex: 1 });

export const body = style({
  position: "relative",
  zIndex: 1,
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
  borderRadius: radii["md+2"],
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

export const emptyPanel = style({
  flexShrink: 0,
  padding: "18px 18px",
  borderBottom: `1px solid ${vars.rule}`,
  fontFamily: vars.font.ui,
  fontSize: 12,
  color: vars.muted,
  lineHeight: 1.5,
});

export const errorBanner = style({
  position: "relative",
  zIndex: 1,
  margin: "0 18px 12px",
  padding: "10px 14px",
  borderRadius: radii["sm+2"],
  border: `1px solid color-mix(in srgb, ${vars.status.error} 60%, transparent)`,
  background: `color-mix(in srgb, ${vars.status.error} 12%, transparent)`,
  color: vars.ink,
  fontFamily: vars.font.ui,
  fontSize: 12,
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
});

export const errorBannerMessage = style({ flex: 1 });

export const errorDismiss = style({
  appearance: "none",
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  padding: 0,
  display: "inline-flex",
});

// Doubled selector (`&&`) beats the `pillBtn` recipe on specificity so the
// paper-tinted overrides actually win on top of `variant="glass"`, which sets
// `color: vars.ink` â€” that would render as dark text on the dark banner.
export const cancelButtonStyle = style({
  selectors: {
    "&&": {
      background: `color-mix(in srgb, ${vars.paper} 14%, transparent)`,
      border: `1px solid color-mix(in srgb, ${vars.paper} 40%, transparent)`,
      color: vars.paper,
    },
    "&&:hover:not(:disabled)": {
      background: `color-mix(in srgb, ${vars.paper} 22%, transparent)`,
      borderColor: `color-mix(in srgb, ${vars.paper} 55%, transparent)`,
    },
  },
});

export const a11yHiddenTitle = style({
  position: "absolute",
  left: -10000,
});

export const discardConfirmBody = style({
  margin: 0,
});

const FC = ".week-structure-fc";

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
