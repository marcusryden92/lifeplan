import { style } from "@vanilla-extract/css";

export const card = style({
  display: "flex",
  flexDirection: "column",
});

export const legacyCardDisabled = style({
  opacity: 0.5,
  pointerEvents: "none",
});

export const cardBody = style({
  padding: "12px 0 16px",
});
