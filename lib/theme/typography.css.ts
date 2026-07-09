import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "./tokens.css";

const baseDisplay = style({
  fontFamily: vars.font.display,
  fontWeight: 500,
  fontFeatureSettings: '"tnum" 1',
});

const baseUI = style({
  fontFamily: vars.font.ui,
});

export const display = styleVariants({
  hero: [baseDisplay, { fontSize: 56, letterSpacing: "-0.045em" }],
  bigStat: [baseDisplay, { fontSize: 44, letterSpacing: "-0.045em" }],
  pageTitle: [baseDisplay, { fontSize: 32, letterSpacing: "-0.03em" }],
  statCard: [baseDisplay, { fontSize: 26, letterSpacing: "-0.04em" }],
  modalTitle: [baseDisplay, { fontSize: 22, letterSpacing: "-0.02em" }],
  sectionHead: [baseDisplay, { fontSize: 20, letterSpacing: "-0.02em" }],
  panelTitle: [baseDisplay, { fontSize: 18, letterSpacing: "-0.02em" }],
  listTitle: [baseDisplay, { fontSize: 16, letterSpacing: "-0.02em" }],
});

export const text = styleVariants({
  body: [baseUI, { fontSize: 13, fontWeight: 500 }],
  bodyLg: [baseUI, { fontSize: 14, fontWeight: 500 }],
  bodySm: [baseUI, { fontSize: 12.5, fontWeight: 500 }],
  row: [baseUI, { fontSize: 13, fontWeight: 500 }],
  label: [baseUI, { fontSize: 11.5, fontWeight: 500 }],
  microLabel: [baseUI, { fontSize: 11, fontWeight: 500 }],
});

export const caption = style([
  baseUI,
  {
    fontSize: 10.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.10em",
    color: vars.inkSoft,
    opacity: 0.85,
  },
]);

export const fieldLabel = style([
  baseUI,
  {
    fontSize: 9.5,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: vars.muted,
  },
]);

export const statusTag = style([
  baseUI,
  {
    fontSize: 9.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
]);
