import { style } from "@vanilla-extract/css";
import { vars } from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";
const DESKTOP = "screen and (min-width: 768px)";

export const bezelFrame = style({
  width: "100%",
  minHeight: "100vh",
  background: vars.bezel,
  padding: 10,
  display: "flex",
  "@media": {
    [MOBILE]: { padding: 0 },
  },
});

export const canvas = style({
  background: vars.paper,
  color: vars.ink,
  fontFamily: vars.font.ui,
  borderRadius: 30,
  flex: 1,
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",
  display: "flex",
  flexDirection: "column",
  minHeight: "calc(100vh - 20px)",
  "@media": {
    [MOBILE]: {
      borderRadius: 0,
      minHeight: "100vh",
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
  overflow: "auto",
  "@media": {
    [MOBILE]: {
      paddingBottom: 72,
    },
  },
});

export const desktopOnly = style({
  display: "flex",
  "@media": {
    [MOBILE]: { display: "none" },
  },
});

export const mobileOnly = style({
  display: "none",
  "@media": {
    [MOBILE]: { display: "flex" },
  },
});
