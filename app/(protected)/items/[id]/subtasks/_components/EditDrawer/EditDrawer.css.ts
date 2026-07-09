import { style, keyframes } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  interactiveTransition,
  radii,
  media,
  display,
  text,
  iconBtn,
  fieldLabel as fieldLabelPreset,
} from "@/lib/theme";

const lockedShake = keyframes({
  "0%, 100%": { transform: "translateX(0)" },
  "20%, 60%": { transform: "translateX(-3px)" },
  "40%, 80%": { transform: "translateX(3px)" },
});

export const drawer = style({
  display: "flex",
  flexDirection: "column",
  gap: space["3.5"],
  padding: "16px 18px",
  borderLeft: `1px solid ${vars.rule}`,
  background: vars.glass.bgSoft,
  borderBottomRightRadius: radii["lg+2"],
  height: "100%",
  minHeight: 0,
  overflow: "auto",
  transition: themeTransition,
  // Inside the mobile bottom sheet (see drawerSlotOpen) the side-column
  // chrome comes off; the sheet owns the border and radius.
  "@media": {
    [media.mobile]: {
      borderLeft: "none",
      borderBottomRightRadius: 0,
    },
  },
});

export const drawerHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const drawerHeaderLabel = style([
  fieldLabelPreset,
  {
    transition: themeTransition,
  },
]);

export const drawerClose = iconBtn();

export const drawerBody = style({
  display: "flex",
  flexDirection: "column",
  gap: space["3.5"],
});

export const drawerTitleInput = style([
  display.modalTitle,
  {
    color: vars.ink,
    background: "transparent",
    border: "none",
    outline: "none",
    padding: "4px 0",
    borderBottom: `1px solid ${vars.rule}`,
    transition: themeTransition,
    selectors: {
      "&:focus": { borderBottomColor: vars.accent.primary },
      "&::placeholder": { color: vars.muted },
    },
  },
]);

export const fieldStack = style({
  display: "flex",
  flexDirection: "column",
  gap: space["1.5"],
});

export const fieldLabel = style([
  fieldLabelPreset,
  {
    transition: themeTransition,
  },
]);

export const splitToggleRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  minHeight: 28,
});

export const splitHint = style([
  text.bodySm,
  {
    color: vars.muted,
    transition: themeTransition,
  },
]);

export const completeHeader = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
});

export const completeCheckbox = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 16,
  height: 16,
  borderRadius: radii.pill,
  border: `1.5px solid ${vars.muted}`,
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  padding: 0,
  // Snappier than the 1s themeTransition so click feedback feels immediate.
  transition: interactiveTransition("background-color", "border-color", "color"),
  selectors: {
    "&[data-completed='true']": {
      background: vars.status.success,
      borderColor: vars.status.success,
      color: vars.paper,
    },
    "&:hover": {
      borderColor: vars.ink,
    },
    "&[data-completed='true']:hover": {
      borderColor: vars.status.success,
      filter: "brightness(0.95)",
    },
    "&[data-locked='true']": { cursor: "not-allowed" },
    "&[data-shake='true']": {
      animation: `${lockedShake} 0.4s ease-in-out`,
      borderColor: vars.status.error,
      color: vars.status.error,
      background: "transparent",
    },
  },
});

export const dateInputFaded = style({
  opacity: 0.4,
  transition: "opacity 160ms ease",
});

export const drawerFooter = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space["2"],
  marginTop: "auto",
  paddingTop: space["4"],
  borderTop: `1px solid ${vars.rule}`,
  transition: themeTransition,
});

export const footerActionGroup = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space["1.5"],
});
