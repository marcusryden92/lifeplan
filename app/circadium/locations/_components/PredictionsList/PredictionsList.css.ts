import { style } from "@vanilla-extract/css";
import { vars, popover } from "@/lib/theme";

// Absolute-positioned overlay so populating the prediction list never grows
// the parent vertically. Anchored to its position: relative wrap.
export const predictions = style([
  popover({ size: "sm" }),
  {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    zIndex: 5,
    display: "flex",
    flexDirection: "column",
    maxHeight: 240,
    overflow: "auto",
  },
]);

export const predictionRow = style({
  textAlign: "left",
  padding: "9px 12px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  fontFamily: vars.font.ui,
  color: vars.ink,
  borderBottom: `1px solid ${vars.glass.stroke}`,
  selectors: {
    "&:last-child": { borderBottom: "none" },
    "&:hover": { background: vars.glass.bgSoft },
  },
});

export const predictionRowActive = style({
  background: vars.glass.bgDeep,
  boxShadow: `inset 3px 0 0 ${vars.ink}`,
});

export const predictionMain = style({
  fontSize: 13,
  fontWeight: 600,
});

export const predictionSub = style({
  fontSize: 11,
  color: vars.muted,
});
