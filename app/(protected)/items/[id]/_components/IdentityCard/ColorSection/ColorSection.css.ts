import { style } from "@vanilla-extract/css";
import { space, themeTransition, fieldLabel as fieldLabelPreset } from "@/lib/theme";

export const fieldStack = style({
  display: "flex",
  flexDirection: "column",
  gap: space["2"],
  minWidth: 0,
});

export const fieldLabel = style([
  fieldLabelPreset,
  {
    transition: themeTransition,
  },
]);
