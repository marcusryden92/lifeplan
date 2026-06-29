import { style } from "@vanilla-extract/css";

const MOBILE = "screen and (max-width: 767px)";

export const page = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
  "@media": {
    [MOBILE]: {
      flex: "0 0 auto",
      minHeight: "auto",
    },
  },
});

export const gridWrap = style({
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr",
  gap: 18,
  padding: "0 28px 28px",
  flex: 1,
  minHeight: 0,
  "@media": {
    [MOBILE]: {
      gridTemplateColumns: "1fr",
      padding: "0 16px 24px",
      gap: 14,
      flex: "0 0 auto",
      minHeight: "auto",
    },
  },
});

export const rightCol = style({
  display: "flex",
  flexDirection: "column",
  gap: 14,
  minHeight: 0,
});
