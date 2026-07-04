import { style } from "@vanilla-extract/css";
import { space } from "@/lib/theme";

export const hoverRow = style({
  display: "flex",
  width: "100%",
  justifyContent: "space-between",
});

export const hoverBtnGroup = style({
  display: "flex",
  justifyContent: "flex-end",
});

export const hoverBtn = style({
  display: "inline-flex",
  padding: space["0.5"],
  color: "inherit",
});
