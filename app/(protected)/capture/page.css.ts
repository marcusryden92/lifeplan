import { style } from "@vanilla-extract/css";
import { vars, themeTransition, popover, glass, media, radii } from "@/lib/theme";


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
    [media.mobile]: { padding: "16px 16px 12px", flexWrap: "wrap", gap: 10 },
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
  "@media": { [media.mobile]: { fontSize: 24 } },
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

export const kbdHint = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: vars.font.ui,
  fontSize: 11,
  color: vars.muted,
  transition: themeTransition,
});

export const mainGrid = style({
  display: "grid",
  gridTemplateColumns: "300px 1fr",
  gap: 16,
  padding: "0 28px 28px",
  flex: 1,
  minHeight: 0,
  "@media": {
    // The desktop sidebar persists through the tablet band, so the rail
    // stacks over the content well before the mobile layout kicks in.
    [media.tablet]: {
      gridTemplateColumns: "1fr",
      flex: "0 0 auto",
      minHeight: "auto",
    },
    [media.mobile]: {
      padding: "0 16px 24px",
      gap: 14,
    },
  },
});

export const queueRail = style({
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  gap: 12,
});

export const queueHead = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  padding: "0 4px",
});

export const queueTitle = style({
  fontFamily: vars.font.display,
  fontSize: 18,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  transition: themeTransition,
});

export const quickAdd = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: radii.pill,
  border: `1px solid ${vars.glass.stroke}`,
  background: vars.glass.bgSoft,
  transition: themeTransition,
});

export const quickAddInput = style({
  flex: 1,
  border: "none",
  outline: "none",
  background: "transparent",
  fontSize: 13,
  fontFamily: vars.font.ui,
  color: vars.ink,
  selectors: { "&::placeholder": { color: vars.muted } },
});

export const queueList = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  overflowY: "auto",
  paddingRight: 4,
  flex: 1,
  minHeight: 0,
});

export const queueRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "10px 12px",
  borderRadius: radii["sm+2"],
  cursor: "pointer",
  border: `1px solid ${vars.rule}`,
  background: vars.glass.bgSoft,
  color: vars.ink,
  fontFamily: vars.font.ui,
  fontSize: 13,
  textAlign: "left",
  transition: themeTransition,
  selectors: {
    "&:hover": { background: vars.glass.bgDeep },
  },
});

export const queueRowActive = style({
  background: vars.ink,
  color: vars.paper,
  borderColor: vars.ink,
  selectors: {
    "&:hover": { background: vars.ink },
  },
});

export const queueRowTitle = style({
  flex: 1,
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const queueRowAge = style({
  fontFamily: vars.font.ui,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  opacity: 0.7,
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
});

export const queueEmpty = style({
  padding: "24px 16px",
  textAlign: "center",
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontSize: 12.5,
});

export const main = style({
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  gap: 14,
  overflowY: "auto",
  paddingRight: 4,
});

export const breadcrumb = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  color: vars.muted,
  fontVariantNumeric: "tabular-nums",
});

export const card = style([
  glass({ fill: "deep", radius: "lg", shadow: "none" }),
  {
    padding: 28,
    display: "flex",
    flexDirection: "column",
    gap: 18,
    "@media": { [media.mobile]: { padding: 20, borderRadius: radii["lg+2"] } },
  },
]);

export const itemTitle = style({
  fontFamily: vars.font.display,
  fontSize: 30,
  fontWeight: 500,
  letterSpacing: "-0.025em",
  lineHeight: 1.1,
  color: vars.ink,
  margin: 0,
  transition: themeTransition,
  "@media": { [media.mobile]: { fontSize: 22 } },
});

export const typeGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 8,
  "@media": { [media.mobile]: { gridTemplateColumns: "repeat(2, 1fr)" } },
});

export const typeCard = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  padding: "14px 10px",
  borderRadius: radii.md,
  border: `1px solid ${vars.rule}`,
  background: vars.glass.bgSoft,
  color: vars.ink,
  cursor: "pointer",
  fontFamily: vars.font.ui,
  textAlign: "center",
  transition: themeTransition,
  selectors: {
    "&:hover": { background: vars.glass.bgDeep },
  },
});

export const typeCardActive = style({
  background: vars.ink,
  color: vars.paper,
  borderColor: vars.ink,
  selectors: {
    "&:hover": { background: vars.ink },
  },
});

export const typeCardDanger = style({
  color: vars.status.error,
  borderColor: vars.status.error,
});

export const typeCardFocused = style({
  outline: `2px solid ${vars.accent.now}`,
  outlineOffset: 2,
});

export const typeCardLabel = style({
  fontFamily: vars.font.display,
  fontSize: 20,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  lineHeight: 1,
  textTransform: "uppercase",
});

export const typeCardSub = style({
  fontSize: 10.5,
  fontWeight: 500,
  opacity: 0.7,
});

export const typeCardKbd = style({
  fontSize: 9,
  fontFamily: vars.font.ui,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  opacity: 0.6,
});

export const fieldGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 12,
  "@media": { [media.mobile]: { gridTemplateColumns: "1fr" } },
});

export const field = style({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: 6,
  padding: "10px 14px",
  borderRadius: radii["sm+2"],
  border: `1px solid ${vars.rule}`,
  background: vars.glass.bgSoft,
  minHeight: 72,
  transition: themeTransition,
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
  border: "none",
  outline: "none",
  background: "transparent",
  fontFamily: vars.font.display,
  fontSize: 20,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  width: "100%",
  height: 26,
  lineHeight: "26px",
  padding: 0,
  fontVariantNumeric: "tabular-nums",
  transition: themeTransition,
  selectors: {
    "&::placeholder": { color: vars.muted, opacity: 0.6 },
  },
});

export const categoryTrigger = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  height: 26,
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: vars.font.display,
  fontSize: 20,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  transition: themeTransition,
});

export const categoryTriggerLabel = style({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
});

export const categoryTriggerEmpty = style({
  color: vars.muted,
});

export const categoryTriggerChevron = style({
  color: vars.muted,
  flexShrink: 0,
  transition: themeTransition,
});

export const categoryDropdownWrap = style({
  position: "relative",
});

export const categoryDropdown = style([
  popover({ size: "sm" }),
  {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: -8,
    right: -8,
    zIndex: 5,
    display: "flex",
    flexDirection: "column",
    maxHeight: 220,
    overflow: "auto",
    padding: 4,
  },
]);

export const categoryDropdownItem = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "8px 10px",
  border: "none",
  borderRadius: radii.xs,
  background: "transparent",
  cursor: "pointer",
  fontFamily: vars.font.ui,
  fontSize: 13,
  fontWeight: 500,
  color: vars.ink,
  textAlign: "left",
  transition: themeTransition,
  selectors: {
    "&:hover": { background: vars.interactive.hoverFill },
  },
});

export const categoryDropdownItemActive = style({
  background: vars.glass.bgDeep,
  boxShadow: `inset 3px 0 0 ${vars.ink}`,
});

export const categoryDropdownItemMuted = style({
  color: vars.muted,
});

export const actionRow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
});

export const footerHint = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  fontFamily: vars.font.ui,
  fontSize: 11,
  color: vars.muted,
  padding: "0 4px",
  transition: themeTransition,
});

export const emptyMain = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "60px 24px",
  textAlign: "center",
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontSize: 14,
  gap: 8,
});

export const emptyMainTitle = style({
  fontFamily: vars.font.display,
  fontSize: 24,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  transition: themeTransition,
});
