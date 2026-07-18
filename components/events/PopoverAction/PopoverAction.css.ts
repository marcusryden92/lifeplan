import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/lib/theme/tokens.css";

export const rowLayout = style({
  width: "100%",
  justifyContent: "flex-start",
  textAlign: "left",
});

export const pillLayout = style({
  flex: 1,
  justifyContent: "center",
});

export const dangerText = style({
  selectors: {
    "&&": { color: vars.status.error },
    "&&:hover:not(:disabled)": { color: vars.status.error },
  },
});

export const iconSlot = styleVariants({
  row: { display: "inline-flex", color: vars.muted },
  danger: { display: "inline-flex", color: vars.status.error },
  primary: { display: "inline-flex" },
  primaryFilled: { display: "inline-flex" },
});
