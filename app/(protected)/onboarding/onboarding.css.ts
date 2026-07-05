import { style, keyframes } from "@vanilla-extract/css";
import {
  vars,
  space,
  radii,
  contentWidth,
  media,
  zIndex,
  formInput,
  colorMixAlpha,
} from "@/lib/theme";

const spin = keyframes({ to: { transform: "rotate(360deg)" } });

// Opaque, AppShell-constrained panel: mounted inside the shell canvas (as an
// overlaySlot) so it clips to the canvas rounding and covers the sidebar too,
// but stays within the bezel. Reads as one solid surface like the assistant /
// WeekStructureModal — no glass, no header.
export const overlayRoot = style({
  position: "absolute",
  inset: 0,
  zIndex: zIndex.modal,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: space["6"],
  background: vars.paper,
  overflowY: "auto",
  "@media": {
    [media.mobile]: {
      padding: space["4"],
      alignItems: "flex-start",
    },
  },
});

export const frameWrap = style({
  position: "relative",
  zIndex: 1,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

// The step content sits directly on the panel (the surface is the overlay
// itself), so this is a plain centered column — no card fill, border, or
// shadow.
export const card = style({
  width: "100%",
  maxWidth: contentWidth.sm,
  height: "min(88vh, 860px)",
  display: "flex",
  flexDirection: "column",
  gap: space["5"],
  padding: space["8"],
  "@media": {
    [media.mobile]: {
      // The overlay scrolls from flex-start on mobile and the soft keyboard
      // fights a fixed height, so let the card size to its content there.
      height: "auto",
      padding: space["5"],
      gap: space["4"],
    },
  },
});

// Wide layout for the embedded AI step — the assistant needs a split-pane
// canvas, so this frame breaks out of the narrow form width.
export const cardWide = style({
  maxWidth: contentWidth.xl,
  width: "100%",
  padding: space["5"],
  gap: space["3"],
  "@media": {
    [media.mobile]: {
      height: "100%",
      padding: space["3"],
    },
  },
});

export const aiWorkspace = style({
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  borderRadius: radii.xl,
  overflow: "hidden",
  border: `1px solid ${vars.glass.stroke}`,
});

export const topRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space["3"],
});

export const progress = style({
  display: "flex",
  gap: space["1.5"],
  flex: 1,
});

export const segment = style({
  height: 4,
  flex: 1,
  borderRadius: radii.pill,
  background: vars.rule,
  transition: "background 200ms ease",
});

export const segmentFilled = style({
  background: vars.accent.primary,
});

export const skipLink = style({
  appearance: "none",
  border: "none",
  background: "transparent",
  color: vars.muted,
  fontSize: 13,
  cursor: "pointer",
  padding: `${space["1"]} ${space["2"]}`,
  borderRadius: radii.sm,
  selectors: {
    "&:hover": { color: vars.ink, background: vars.interactive.hoverFill },
  },
});

export const title = style({
  fontFamily: vars.font.display,
  fontSize: 28,
  lineHeight: 1.15,
  fontWeight: 600,
  color: vars.ink,
  margin: 0,
  "@media": {
    [media.mobile]: { fontSize: 23 },
  },
});

export const subtitle = style({
  fontSize: 15,
  lineHeight: 1.5,
  color: vars.muted,
  margin: 0,
  marginTop: space["1.5"],
});

export const body = style({
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: space["4"],
});

export const footer = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space["3"],
  marginTop: space["2"],
});

export const footerActions = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  marginLeft: "auto",
});

// Welcome
export const welcomeCenter = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: space["4"],
  paddingBlock: space["4"],
  // Body is a flex column with fixed height now; center the wordmark in it.
  marginBlock: "auto",
});

export const brand = style({
  fontFamily: vars.font.display,
  fontSize: 40,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  margin: 0,
});

export const tagline = style({
  fontSize: 16,
  lineHeight: 1.55,
  color: vars.muted,
  maxWidth: 420,
  margin: 0,
});

// Roles picker — two columns (suggestions / selected), CategoryBadge tint
export const areasColumns = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: space["4"],
  "@media": {
    [media.mobile]: {
      gridTemplateColumns: "1fr",
      gap: space["4"],
    },
  },
});

export const areaColumn = style({
  display: "flex",
  flexDirection: "column",
  // Rows size to their content, not the full column width, so an area reads
  // as a compact badge instead of a full-width bar.
  alignItems: "flex-start",
  gap: space["2"],
  minWidth: 0,
});

export const areaColumnTitle = style({
  fontSize: 12.5,
  fontWeight: 500,
  color: vars.muted,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

// Same tint language as CategoryBadge (per-row color via the --area-color
// custom property) but at a readable size and in sentence case.
export const areaRow = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space["2"],
  maxWidth: "100%",
  padding: `${space["1.5"]} ${space["2.5"]}`,
  borderRadius: radii.md,
  border: "1px solid var(--area-color)",
  background: `color-mix(in srgb, var(--area-color) ${colorMixAlpha.lightFill}%, transparent)`,
  color: vars.ink,
  fontSize: 13.5,
  fontWeight: 500,
  cursor: "pointer",
  textAlign: "left",
  transition: "background 150ms ease",
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, var(--area-color) ${colorMixAlpha.hoverFill}%, transparent)`,
    },
  },
});

export const areaRowLabel = style({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

// A selected row is a drag-to-reorder handle + remove button, not a single
// click target, so it drops the pointer cursor.
export const areaRowSelected = style({
  cursor: "default",
});

export const areaRowDragging = style({
  opacity: 0.4,
});

// Drop-position indicators, mirroring the categories rail: a 2px accent line at
// the leading/trailing edge of the row the pointer would drop before/after.
export const areaRowDropBefore = style({
  boxShadow: `inset 0 2px 0 0 ${vars.accent.primary}`,
});

export const areaRowDropAfter = style({
  boxShadow: `inset 0 -2px 0 0 ${vars.accent.primary}`,
});

export const areaRowGrip = style({
  display: "inline-flex",
  flexShrink: 0,
  cursor: "grab",
  color: "var(--area-color)",
  opacity: 0.75,
  selectors: {
    "&:active": { cursor: "grabbing" },
  },
});

export const areaRowRemove = style({
  appearance: "none",
  border: "none",
  background: "transparent",
  padding: 0,
  display: "inline-flex",
  flexShrink: 0,
  cursor: "pointer",
  color: "var(--area-color)",
  opacity: 0.75,
  selectors: {
    "&:hover": { opacity: 1 },
  },
});

export const areaRowIcon = style({
  display: "inline-flex",
  flexShrink: 0,
  color: "var(--area-color)",
});

export const areaEmptyNote = style({
  fontSize: 13,
  color: vars.muted,
  fontStyle: "italic",
  paddingBlock: space["2"],
});

export const customRow = style({
  display: "flex",
  gap: space["2"],
  alignItems: "center",
});

export const selectionCaption = style({
  fontSize: 13,
  color: vars.muted,
});

// Brain dump — jotted rows with an inline type control
export const dumpList = style({
  display: "flex",
  flexDirection: "column",
  gap: space["2"],
});

export const dumpRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["2.5"],
  padding: `${space["2"]} ${space["2.5"]}`,
  borderRadius: radii.sm,
  border: `1px solid ${vars.glass.stroke}`,
  background: vars.glass.bgSoft,
});

export const dumpRowTitle = style({
  flex: 1,
  minWidth: 0,
  fontFamily: vars.font.ui,
  fontSize: 14,
  color: vars.ink,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const dumpRowControl = style({
  flexShrink: 0,
  width: 190,
});

export const dumpRemove = style({
  appearance: "none",
  border: "none",
  background: "transparent",
  color: vars.muted,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  padding: space["1"],
  borderRadius: radii.sm,
  flexShrink: 0,
  selectors: {
    "&:hover": { color: vars.ink, background: vars.interactive.hoverFill },
  },
});

export const dumpEmpty = style({
  fontSize: 13,
  color: vars.muted,
  fontStyle: "italic",
  paddingBlock: space["2"],
});

// Shared inputs — built on the app-wide formInput recipe so onboarding fields
// match every other form surface (glass fill, glass stroke, accent focus).
export const input = style([
  formInput({ variant: "boxed" }),
  { appearance: "none" },
]);

export const fieldStack = style({
  display: "flex",
  flexDirection: "column",
  gap: space["1.5"],
});

export const fieldLabel = style({
  fontSize: 13,
  fontWeight: 500,
  color: vars.ink,
});

export const fieldHelp = style({
  fontSize: 12.5,
  color: vars.muted,
});

// Week form
export const timeRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["2.5"],
});

export const timeInput = style([
  formInput({ variant: "boxed" }),
  {
    appearance: "none",
    width: "auto",
    fontVariantNumeric: "tabular-nums",
  },
]);

export const timeDash = style({
  color: vars.muted,
});

export const dayToggles = style({
  display: "flex",
  gap: space["1.5"],
  flexWrap: "wrap",
});

export const dayToggle = style({
  width: 40,
  height: 34,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: radii.md,
  border: `1px solid ${vars.glass.stroke}`,
  background: vars.glass.bgSoft,
  color: vars.inkSoft,
  fontSize: 12.5,
  cursor: "pointer",
  transition: "background 150ms ease",
  selectors: {
    "&:hover": { background: vars.interactive.hoverFill },
  },
});

export const dayToggleOn = style({
  borderColor: "transparent",
  background: vars.accent.primary,
  color: vars.textOnAccent,
  fontWeight: 500,
});

export const sectionToggleRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space["3"],
});

export const previewNote = style({
  fontSize: 13,
  color: vars.muted,
  fontStyle: "italic",
});

// Places — multi-row location editor
export const locationRows = style({
  display: "flex",
  flexDirection: "column",
  gap: space["2"],
});

export const locationRow = style({
  display: "grid",
  gridTemplateColumns: "minmax(96px, 0.4fr) 1fr",
  gap: space["2"],
  alignItems: "start",
});

export const nameField = style([formInput({ variant: "boxed" })]);

export const addressCell = style({
  position: "relative",
});

export const addressWrap = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
});

export const addressIcon = style({
  position: "absolute",
  left: space["3"],
  top: "50%",
  transform: "translateY(-50%)",
  color: vars.muted,
  display: "inline-flex",
  pointerEvents: "none",
});

// Boxed input matching the formInput recipe, but written explicitly so the
// left padding that clears the MapPin icon is never overridden by recipe
// class ordering (composing the recipe let its 12px padding win, so the icon
// sat on top of the text).
export const addressInput = style({
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  fontWeight: 500,
  color: vars.ink,
  width: "100%",
  outline: "none",
  padding: "9px 36px 9px 38px",
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: radii["sm+2"],
  transition: "border-color 150ms ease",
  selectors: {
    "&::placeholder": { color: vars.muted },
    "&:focus": { borderColor: vars.accent.primary },
  },
});

export const addressSelected = style({
  borderColor: vars.accent.primary,
});

export const addressSpinner = style({
  position: "absolute",
  right: space["2.5"],
  color: vars.muted,
  display: "inline-flex",
  animation: `${spin} 0.8s linear infinite`,
});

// Places slots (legacy single-slot styles, still used elsewhere)
export const slotStack = style({
  display: "flex",
  flexDirection: "column",
  gap: space["2.5"],
});

export const slot = style({
  display: "flex",
  alignItems: "center",
  gap: space["3"],
  padding: space["3"],
  borderRadius: radii.lg,
  border: `1px solid ${vars.rule}`,
  background: vars.paper,
});

export const slotMeta = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
  flex: 1,
});

export const slotLabel = style({
  fontSize: 13,
  fontWeight: 500,
  color: vars.ink,
});

export const slotValue = style({
  fontSize: 13,
  color: vars.muted,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const slotEmpty = style({
  fontSize: 13,
  color: vars.muted,
  fontStyle: "italic",
});

// AI offer
export const offerCard = style({
  display: "flex",
  flexDirection: "column",
  gap: space["3"],
  padding: space["4"],
  borderRadius: radii.lg,
  border: `1px solid ${vars.rule}`,
  background: vars.glass.bgSoft,
});

export const offerList = style({
  display: "flex",
  flexDirection: "column",
  gap: space["2"],
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const offerItem = style({
  display: "flex",
  alignItems: "center",
  gap: space["2"],
  fontSize: 14,
  color: vars.ink,
});

export const offerDot = style({
  width: 6,
  height: 6,
  borderRadius: radii.pill,
  background: vars.accent.primary,
  flexShrink: 0,
});

export const aiActions = style({
  display: "flex",
  flexDirection: "column",
  gap: space["2"],
});

export const errorText = style({
  fontSize: 13,
  color: vars.status.error,
});
