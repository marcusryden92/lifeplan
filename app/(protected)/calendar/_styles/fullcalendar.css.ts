import { globalStyle } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

const ROOT = ".circadium-calendar";

globalStyle(`${ROOT}`, {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
});

globalStyle(`${ROOT} .fc`, {
  fontFamily: vars.font.ui,
  flex: 1,
  minHeight: 0,
});

globalStyle(`${ROOT} .fc-scrollgrid`, {
  border: "none !important",
  background: "transparent !important",
});

globalStyle(
  `${ROOT} .fc-theme-standard td, ${ROOT} .fc-theme-standard th, ${ROOT} .fc-theme-standard .fc-scrollgrid`,
  {
    borderColor: `${vars.rule} !important`,
  },
);

globalStyle(`${ROOT} .fc-media-screen`, {
  border: "none !important",
  borderRadius: "0 !important",
});

globalStyle(`${ROOT} .fc-col-header`, {
  background: `color-mix(in srgb, ${vars.ink} 3%, transparent)`,
});

globalStyle(`${ROOT} .fc-col-header-cell`, {
  borderColor: `${vars.rule} !important`,
});

globalStyle(`${ROOT} .fc-col-header-cell-cushion`, {
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

globalStyle(`${ROOT} .fc-timegrid-axis-cushion`, {
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  fontWeight: 600,
  color: vars.muted,
  fontVariantNumeric: "tabular-nums",
});

globalStyle(`${ROOT} .fc-timegrid-slot-label-cushion`, {
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  fontWeight: 600,
  color: vars.muted,
  fontVariantNumeric: "tabular-nums",
  padding: "0 8px",
});

globalStyle(`${ROOT} .fc-timegrid-slot`, {
  height: "2.4rem !important",
  borderColor: `${vars.rule} !important`,
});

globalStyle(`${ROOT} .fc-timegrid-col`, {
  background: "transparent !important",
});

globalStyle(`${ROOT} .fc-day-today`, {
  background: `color-mix(in srgb, ${vars.accent.now} 4%, transparent) !important`,
});

globalStyle(`${ROOT} .fc-timegrid-event-harness`, {
  border: 0,
});

globalStyle(`${ROOT} .fc-event`, {
  border: "none !important",
  borderRadius: "0 !important",
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "none !important",
  transition: themeTransition,
});

globalStyle(`${ROOT} .fc-event-main`, {
  padding: "0 !important",
  background: "transparent !important",
});

globalStyle(`${ROOT} .fc-v-event`, {
  border: "none !important",
});

globalStyle(`${ROOT} .fc-bg-event`, {
  opacity: "1 !important",
  pointerEvents: "none",
});

globalStyle(`${ROOT} .fc-bg-event:hover`, {
  transform: "none",
  boxShadow: "none",
});

globalStyle(`${ROOT} .fc-timegrid-now-indicator-line`, {
  borderColor: `${vars.accent.now} !important`,
  borderWidth: "2px !important",
});

globalStyle(`${ROOT} .fc-timegrid-now-indicator-arrow`, {
  borderColor: `${vars.accent.now} !important`,
  display: "none",
});

globalStyle(`${ROOT} .fc-scroller`, {
  overflow: "auto !important",
  scrollbarWidth: "none",
  scrollbarGutter: "auto",
});

globalStyle(`${ROOT} .fc-scroller::-webkit-scrollbar`, {
  width: 0,
  height: 0,
  background: "transparent",
});

globalStyle(`${ROOT} .fc-scroller::-webkit-scrollbar-thumb`, {
  background: "transparent",
});

globalStyle(
  [
    `${ROOT} .fc-scrollgrid-sync-table`,
    `${ROOT} table.fc-col-header`,
    `${ROOT} .fc-timegrid-body`,
    `${ROOT} .fc-timegrid-slots`,
    `${ROOT} .fc-timegrid-slots > table`,
    `${ROOT} .fc-timegrid-cols`,
    `${ROOT} .fc-timegrid-cols > table`,
  ].join(", "),
  {
    width: "100% !important",
  },
);

globalStyle(`${ROOT} .fc-timegrid-daygrid-day-top`, {
  display: "none",
});

globalStyle(`${ROOT} .fc-timegrid-axis`, {
  borderColor: `${vars.rule} !important`,
});
