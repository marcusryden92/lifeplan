import { style } from "@vanilla-extract/css";
import { media } from "@/lib/theme";

export const card = style({
  display: "flex",
  flexDirection: "column",
});

export const cardBody = style({
  padding: "12px 0",
});

export const fieldGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px 26px",
  "@media": {
    [media.mobile]: { gridTemplateColumns: "1fr" },
  },
});
