import { style, keyframes } from "@vanilla-extract/css";
import {
  vars,
  DURATIONS,
  popover,
  backdropFilters,
  formInput,
  media,
} from "@/lib/theme";


const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const slideUp = keyframes({
  from: { opacity: 0, transform: "translateY(8px) scale(0.98)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

const sheetUp = keyframes({
  from: { transform: "translateY(100%)" },
  to: { transform: "translateY(0)" },
});

export const overlay = style({
  position: "fixed",
  inset: 0,
  background: vars.overlay,
  backdropFilter: backdropFilters.palette,
  WebkitBackdropFilter: backdropFilters.palette,
  zIndex: 50,
  animationName: fadeIn,
  animationDuration: `${DURATIONS.modal}s`,
  animationTimingFunction: "ease",
});

export const dialog = style([
  popover({ size: "xl" }),
  {
    position: "fixed",
    zIndex: 51,
    top: "12%",
    left: 0,
    right: 0,
    marginLeft: "auto",
    marginRight: "auto",
    width: "min(640px, calc(100vw - 32px))",
    maxHeight: "min(560px, calc(100vh - 24%))",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    animationName: slideUp,
    animationDuration: `${DURATIONS.modal}s`,
    animationTimingFunction: "ease",
    "@media": {
      [media.mobile]: {
        top: "auto",
        bottom: 0,
        left: 0,
        right: 0,
        marginLeft: 0,
        marginRight: 0,
        width: "100%",
        maxHeight: "70vh",
        borderRadius: "22px 22px 0 0",
        animationName: sheetUp,
        animationDuration: `${DURATIONS.modal}s`,
      },
    },
  },
]);

export const inputRow = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 18px",
  borderBottom: `1px solid ${vars.rule}`,
});

export const inputIcon = style({
  display: "inline-flex",
  alignItems: "center",
  color: vars.inkSoft,
});

export const input = style([
  formInput({ variant: "underline" }),
  {
    flex: 1,
    border: "none",
    borderBottom: "none",
    padding: 0,
    background: "transparent",
    fontSize: 17,
    fontWeight: 500,
    selectors: {
      "&:focus": { borderBottom: "none" },
    },
  },
]);

export const scrollArea = style({
  overflowY: "auto",
  flex: 1,
  minHeight: 0,
});

export const group = style({
  padding: "8px 0",
  selectors: {
    "&:not(:last-child)": {
      borderBottom: `1px solid ${vars.rule}`,
    },
  },
});

export const groupLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: vars.muted,
  padding: "6px 18px",
});

export const item = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "9px 18px",
  cursor: "pointer",
  border: "none",
  background: "transparent",
  width: "100%",
  textAlign: "left",
  color: vars.ink,
  fontFamily: vars.font.ui,
  textDecoration: "none",
  selectors: {
    "&:hover": {
      background: vars.interactive.hoverFill,
    },
  },
});

export const itemActive = style({
  background: vars.glass.bgSoft,
});

export const itemIcon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  color: vars.inkSoft,
  flexShrink: 0,
});

export const itemBody = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
  flex: 1,
});

export const itemTitle = style({
  fontSize: 13.5,
  fontWeight: 500,
  color: vars.ink,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const itemSub = style({
  fontSize: 11.5,
  color: vars.muted,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const emptyState = style({
  padding: "36px 18px",
  textAlign: "center",
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontSize: 13,
});

export const footer = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 14px",
  borderTop: `1px solid ${vars.rule}`,
  background: vars.glass.bgSoft,
  fontFamily: vars.font.ui,
  fontSize: 11,
  color: vars.muted,
  flexWrap: "wrap",
  "@media": {
    [media.mobile]: {
      display: "none",
    },
  },
});

export const kbd = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 16,
  fontFamily: vars.font.ui,
  fontSize: 10,
  fontWeight: 600,
  color: vars.inkSoft,
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.rule}`,
  borderRadius: 5,
  padding: "1px 5px",
  marginRight: 4,
});
