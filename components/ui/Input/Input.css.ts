import { style } from "@vanilla-extract/css";
import {
  space,
  text,
  vars,
  themeTransition,
  fieldLabel as fieldLabelText,
} from "@/lib/theme";

export const field = style({
  display: "flex",
  flexDirection: "column",
  gap: space["1.5"],
  minWidth: 0,
});

export const fieldLabelCls = style([
  fieldLabelText,
  {
    transition: themeTransition,
  },
]);

export const fieldNote = style([
  text.label,
  {
    color: vars.muted,
    lineHeight: 1.45,
    transition: themeTransition,
  },
]);
