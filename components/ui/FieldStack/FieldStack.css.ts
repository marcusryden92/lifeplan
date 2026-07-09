import { style } from "@vanilla-extract/css";
import {
  space,
  vars,
  themeTransition,
  text,
  fieldLabel as fieldLabelPreset,
} from "@/lib/theme";

export const fieldStack = style({
  display: "flex",
  flexDirection: "column",
  gap: space["2"],
  minWidth: 0,
});

// Spans the full width of a multi-column field grid (e.g. IdentityCard's Place row).
export const fieldStackFull = style({
  gridColumn: "1 / -1",
});

export const fieldLabel = style([
  fieldLabelPreset,
  {
    whiteSpace: "nowrap",
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
