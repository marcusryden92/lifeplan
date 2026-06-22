import { style } from "@vanilla-extract/css";

const MOBILE = "screen and (max-width: 767px)";

export const card = style({
  display: "flex",
  flexDirection: "column",
});

export const cardBody = style({
  padding: "16px 0",
});

export const fieldGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px 26px",
  "@media": {
    [MOBILE]: { gridTemplateColumns: "1fr" },
  },
});
