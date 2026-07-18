import { style } from "@vanilla-extract/css";
import { vars } from "@/lib/theme/tokens.css";
import { space, radii, zIndex, media } from "@/lib/theme/scales";
import { backdropFilters } from "@/lib/theme/effects";
import { buttonTransition } from "@/lib/theme/transitions";

const SIZE = 44;

// Floating corner chrome: search top-left, assistant top-right. Mobile-only —
// the desktop sidebar already exposes search (Ctrl+J) and the Assistant button,
// so on desktop these are redundant. On mobile the bottom floating menu has no
// search/AI, so these fill that gap. Fixed (not absolute): mainColumn scrolls
// on mobile, so an absolute child would scroll away with the content.
const cornerBase = style({
  position: "fixed",
  top: `calc(${space["3"]}px + env(safe-area-inset-top, 0px))`,
  zIndex: zIndex.raised,
  width: SIZE,
  height: SIZE,
  borderRadius: radii.pill,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  transition: buttonTransition,
  selectors: {
    "&:active": { transform: "scale(0.96)" },
  },
  "@media": {
    [media.tabletUp]: { display: "none" },
  },
});

export const searchButton = style([
  cornerBase,
  {
    left: space["3"],
    color: vars.inkSoft,
    background: vars.glass.bg,
    backdropFilter: backdropFilters.modal,
    WebkitBackdropFilter: backdropFilters.modal,
    border: `1px solid ${vars.glass.stroke}`,
    boxShadow: vars.shadow.panelSm,
    selectors: {
      "&:hover": {
        color: vars.ink,
        background: vars.glass.bgDeep,
        boxShadow: vars.shadow.panel,
      },
    },
  },
]);

export const assistantButton = style([
  cornerBase,
  {
    right: space["3"],
    color: vars.paper,
    background: vars.ink,
    border: "none",
    boxShadow: `${vars.shadow.panelSm}, inset 0 1px 0 rgba(255,255,255,0.18)`,
  },
]);
