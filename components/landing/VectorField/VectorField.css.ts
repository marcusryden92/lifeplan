import { style } from "@vanilla-extract/css";

export const host = style({
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  zIndex: 0,
});

export const canvas = style({
  display: "block",
  width: "100%",
  height: "100%",
});
