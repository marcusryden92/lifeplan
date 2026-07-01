import { style } from "@vanilla-extract/css";
import { vars, themeTransition, media, radii } from "@/lib/theme";


export const bezelFrame = style({
  width: "100vw",
  height: "100vh",
  boxSizing: "border-box",
  background: vars.bezel,
  padding: 5,
  display: "flex",
  overflow: "hidden",
  transition: themeTransition,
  "@media": {
    [media.mobile]: { padding: 0 },
  },
});

export const canvas = style({
  background: vars.paper,
  color: vars.ink,
  fontFamily: vars.font.ui,
  borderRadius: radii["3xl"],
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",
  display: "flex",
  flexDirection: "column",
  transition: themeTransition,
  "@media": {
    [media.mobile]: {
      borderRadius: radii.none,
    },
  },
});

export const contentRow = style({
  position: "relative",
  zIndex: 1,
  display: "flex",
  flex: 1,
  minHeight: 0,
});

export const mainColumn = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  "@media": {
    [media.mobile]: {
      paddingBottom: 96,
      overflow: "auto",
      WebkitOverflowScrolling: "touch",
    },
  },
});

export const desktopOnly = style({
  display: "flex",
  "@media": {
    [media.mobile]: { display: "none" },
  },
});

export const mobileOnly = style({
  display: "none",
  "@media": {
    [media.mobile]: { display: "flex" },
  },
});
