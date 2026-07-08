import { style } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  radii,
  text,
  fieldLabel as fieldLabelPreset,
} from "@/lib/theme";

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

export const fieldValue = style([
  text.row,
  {
    fontWeight: 600,
    color: vars.ink,
    fontVariantNumeric: "tabular-nums",
    transition: themeTransition,
  },
]);

export const numberInput = style([
  text.row,
  {
    background: vars.glass.bgSoft,
    border: `1px solid ${vars.glass.stroke}`,
    borderRadius: radii["sm+2"],
    padding: "8px 12px",
    color: vars.ink,
    outline: "none",
    width: "100%",
    fontVariantNumeric: "tabular-nums",
    transition: themeTransition,
    selectors: {
      "&:focus": {
        borderColor: vars.accent.primary,
      },
    },
  },
]);
