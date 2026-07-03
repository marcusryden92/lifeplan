import { style } from "@vanilla-extract/css";
import { space } from "@/lib/theme";

export const hoverActions = style({
  display: "flex",
  width: "100%",
  justifyContent: "space-between",
  alignItems: "center",
});

export const actionGroup = style({
  display: "flex",
  gap: space["2"],
});

export const iconButton = style({
  display: "inline-flex",
  padding: space["0.5"],
  color: "inherit",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  },
});
