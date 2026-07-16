import { style } from "@vanilla-extract/css";

export const container = style({
  flex: 1,
  minHeight: 0,
  position: "relative",
  overflow: "hidden",
  cursor: "grab",
  selectors: {
    "&[data-panning='true']": { cursor: "grabbing" },
  },
});

export const canvas = style({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  display: "block",
  touchAction: "none",
});
