import { style } from "@vanilla-extract/css";
import { vars } from "@/lib/theme/tokens.css";
import { space, contentWidth, media } from "@/lib/theme/scales";
import { iconBtn } from "@/lib/theme/recipes.css";
import { display, text, caption } from "@/lib/theme/typography.css";
import {
  themeTransition,
  interactiveTransition,
} from "@/lib/theme/transitions";
import { zIndex } from "@/lib/theme/scales";

export const page = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
});

// Owns the scroll so that overlays anchored to `.page` (AIDraftModal) don't
// scroll away with the content underneath.
export const scrollArea = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
  overflow: "auto",
});

export const innerWrap = style({
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  padding: "20px 56px 28px",
  width: "100%",
  maxWidth: contentWidth.xl,
  marginInline: "auto",
  flex: 1,
  minHeight: 0,
  "@media": {
    [media.mobile]: { padding: "16px 16px 24px" },
  },
});

export const backRow = style({
  display: "flex",
  alignItems: "center",
  paddingBottom: space["1.5"],
});

export const backLink = style([
  text.bodySm,
  {
    display: "inline-flex",
    alignItems: "center",
    gap: space["1.5"],
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: vars.muted,
    background: "transparent",
    border: "none",
    padding: "6px 0",
    cursor: "pointer",
    transition: themeTransition,
    selectors: {
      "&:hover": { color: vars.ink },
    },
  },
]);

export const titleBlock = style({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: space["6"],
  marginTop: space["3.5"],
  "@media": {
    [media.mobile]: {
      flexDirection: "column",
      alignItems: "stretch",
      gap: space["3.5"],
    },
  },
});

// Shared geometry so display <-> edit doesn't push following content.
const TITLE_LINE_HEIGHT = 56;
const TITLE_BORDER = 2;

export const title = style([
  display.hero,
  {
    lineHeight: `${TITLE_LINE_HEIGHT}px`,
    color: vars.ink,
    margin: 0,
    padding: 0,
    display: "block",
    boxSizing: "content-box",
    borderBottom: `${TITLE_BORDER}px solid transparent`,
    transition: themeTransition,
    "@media": {
      [media.mobile]: { fontSize: 38, lineHeight: "38px" },
    },
  },
]);

// The <Input variant="titleInline"> supplies the accent underline + box reset;
// this layers the hero typography and the height matched to the static title so
// toggling rename in/out doesn't shift layout.
export const titleEditInput = style([
  display.hero,
  {
    lineHeight: `${TITLE_LINE_HEIGHT}px`,
    display: "block",
    height: TITLE_LINE_HEIGHT,
    "@media": {
      [media.mobile]: { fontSize: 38, lineHeight: "38px", height: 38 },
    },
  },
]);

export const titleClickable = style({
  cursor: "text",
  selectors: {
    "&:hover": { opacity: 0.85 },
  },
});

export const editableTitleWrap = style({
  flex: 1,
  minWidth: 0,
});

export const titleHoverRow = style({
  display: "flex",
  alignItems: "center",
  gap: space["3"],
  minWidth: 0,
});

export const renamePencil = style([
  iconBtn(),
  {
    alignSelf: "flex-start",
    marginTop: space["1"],
    opacity: 0,
    transition: interactiveTransition("opacity", "color", "background-color"),
    selectors: {
      [`${titleHoverRow}:hover &`]: { opacity: 1 },
    },
  },
]);

export const headActions = style({
  display: "flex",
  gap: space["4"],
  flexShrink: 0,
  alignItems: "flex-end",
});

export const readyCluster = style({
  position: "relative",
  minWidth: 124,
});

export const readyHint = style([
  caption,
  {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    lineHeight: 1.35,
    textAlign: "center",
  },
]);

export const headActionsCluster = style({
  display: "flex",
  gap: space["2"],
  alignItems: "center",
});

export const tabBodyWrap = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
});

// Sticky within the page scroll area: sits at the content end when the page
// is short, pins to the viewport bottom edge when it overflows — the delete
// row and its top border never move, whatever the columns above are doing.
// The negative bottom margin mirrors innerWrap's bottom padding
// (ItemDetailLayout.css.ts) so the dock is flush with the scrollport edge in
// both states instead of jumping 28px between them.
export const deleteDock = style({
  bottom: 0,
  marginTop: "auto",
  marginBottom: `-${space["7"]}px`,
  backgroundColor: vars.surface.content,
  flexShrink: 0,
  zIndex: zIndex.docked,
  borderTop: `1px solid ${vars.rule}`,
  paddingTop: space["2.5"],
  paddingBottom: space["2.5"],
  transition: themeTransition,
  "@media": {
    [media.mobile]: { marginBottom: `-${space["6"]}px` },
  },
});
