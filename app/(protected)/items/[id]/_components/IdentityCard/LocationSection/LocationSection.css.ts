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
  gridColumn: "1 / -1",
});

export const fieldLabel = style([
  fieldLabelPreset,
  {
    transition: themeTransition,
  },
]);

export const placeRow = style({
  display: "flex",
  alignItems: "top",
  gap: space["2.5"],
});

// Reserves a fixed line so the "from {category}" hint can toggle visibility
// without the surrounding column shifting up/down.
export const hintRow = style({
  display: "flex",
  alignItems: "center",
  minHeight: 17,
  marginTop: space["0.5"],
});

// Indented to align the first letter of "from ..." with the first letter of
// the "Inherited" / "Override" labels inside the SegmentedControl above.
// SegmentedControl is: 1px border + 3px outer padding + 14px button padding = 18px.
export const inheritedHint = style([
  text.microLabel,
  {
    paddingLeft: space["5"],
    color: vars.muted,
    minWidth: 0,
    overflowWrap: "anywhere",
  },
]);

// Pulls ghost-size-sm buttons flush-left under the field grid by negating the
// button's internal left padding (pillBtn sm = padding: 6px 14px).
export const flushLeftBtn = style({
  marginLeft: `-${space["3.5"]}`,
});
