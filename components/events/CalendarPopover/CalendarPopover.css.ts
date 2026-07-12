import { style, keyframes } from "@vanilla-extract/css";
import {
  space,
  vars,
  interactiveTransition,
  radii,
  borderWidth,
  display,
  text,
  iconBtn,
  media,
  backdropFilters,
  DURATIONS,
  fieldLabel,
} from "@/lib/theme";

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const sheetUp = keyframes({
  from: { transform: "translateY(100%)" },
  to: { transform: "translateY(0)" },
});

// Layout-only â€” the popover() recipe owns the glass surface (fill, blur,
// stroke, shadow, radius). This file adds the calendar-popover-specific
// positioning, sizing limits, font, and viewport guards.
export const calendarPopover = style({
  position: "fixed",
  maxWidth: "calc(100vw - 20px)",
  maxHeight: "calc(100vh - 20px)",
  zIndex: 50,
  overflow: "hidden",
  fontFamily: vars.font.ui,
  color: vars.ink,
});

// Mobile presentation: a bottom sheet instead of an anchored floating box.
// Applied alongside calendarPopover when the component detects mobile (the
// anchored inline top/left/width are skipped there, so these win).
export const calendarPopoverSheet = style({
  left: 0,
  right: 0,
  bottom: 0,
  top: "auto",
  width: "auto",
  maxWidth: "100vw",
  maxHeight: ["75vh", "75dvh"],
  overflowY: "auto",
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
  animation: `${sheetUp} ${DURATIONS.modal}s ease`,
});

// Radix renders no overlay in non-modal mode, so this only materializes on
// mobile where the dialog is modal — dimming the calendar behind the sheet.
export const sheetOverlay = style({
  position: "fixed",
  inset: 0,
  zIndex: 49,
  background: vars.overlay,
  backdropFilter: backdropFilters.palette,
  WebkitBackdropFilter: backdropFilters.palette,
  animation: `${fadeIn} ${DURATIONS.modal}s ease`,
});

export const header = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  padding: "10px 12px",
  borderBottom: `1px solid ${vars.rule}`,
});

export const dragHandle = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 26,
  padding: 0,
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "grab",
  borderRadius: radii.xs,
  transition: interactiveTransition("color"),
  selectors: {
    "&:hover": { color: vars.ink },
    "&:active": { cursor: "grabbing" },
  },
  "@media": {
    [media.mobile]: { display: "none" },
  },
});

export const headerBadges = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  flex: 1,
  minWidth: 0,
  flexWrap: "wrap",
});

export const closeBtn = iconBtn({ size: "sm" });

// --- Title row (display font, fixed height, accent underline when editing)

const TITLE_LINE_HEIGHT = 26;
const TITLE_BORDER = 2;

export const titleRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  padding: "12px 14px 0",
});

export const titleStatic = style([
  display.modalTitle,
  {
    lineHeight: `${TITLE_LINE_HEIGHT}px`,
    color: vars.ink,
    margin: 0,
    padding: 0,
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    height: TITLE_LINE_HEIGHT,
    boxSizing: "content-box",
    // Transparent border reserves the same vertical space the editing input's
    // accent underline occupies, so swapping in/out doesn't pop the layout.
    borderBottom: `${TITLE_BORDER}px solid transparent`,
    cursor: "text",
  },
]);

// The <Input variant="titleInline"> supplies the accent underline + box reset;
// this layers the modal-title typography and the height matched to titleStatic
// so toggling rename in/out doesn't shift layout.
export const titleInput = style([
  display.modalTitle,
  {
    lineHeight: `${TITLE_LINE_HEIGHT}px`,
    flex: 1,
    display: "block",
    height: TITLE_LINE_HEIGHT,
  },
]);

export const renamePencil = iconBtn({ size: "sm" });

export const body = style({
  padding: "10px 14px 14px",
  display: "flex",
  flexDirection: "column",
  gap: space["3"],
});

export const metaRow = style([
  text.bodySm,
  {
    display: "flex",
    alignItems: "center",
    gap: space["2"],
    color: vars.inkSoft,
    fontVariantNumeric: "tabular-nums",
  },
]);

export const footer = style({
  paddingTop: space["2"],
  borderTop: `${borderWidth.hairline}px solid ${vars.rule}`,
  display: "flex",
  flexDirection: "column",
  gap: space["0.5"],
});

// Start/end time fields — shared by EventPopover and TemplateEventPopover.
export const timeFieldsRow = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: space["2"],
});

export const timeField = style({
  display: "flex",
  flexDirection: "column",
  gap: space["1"],
  minWidth: 0,
});

export const timeFieldLabel = fieldLabel;

export const timeFieldStatic = style([
  text.row,
  {
    padding: "6px 0",
    color: vars.ink,
    fontVariantNumeric: "tabular-nums",
  },
]);
