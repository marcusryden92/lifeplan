import { style } from "@vanilla-extract/css";
import {
  space,
  vars,
  buttonTransition,
  backdropFilters,
  radii,
  zIndex,
  media,
} from "@/lib/theme";

const SIZE = 44;

// Floating corner chrome: search top-left, assistant top-right. Sits above
// page content but below the assistant overlay (zIndex.floating), so opening
// the assistant covers them. Desktop-only — the mobile floating menu owns
// these actions, and below the tablet breakpoint mainColumn scrolls (absolute
// children would scroll away with the content).
const cornerBase = style({
  position: "absolute",
  top: space["5"],
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
    [media.tablet]: { display: "none" },
  },
});

export const searchButton = style([
  cornerBase,
  {
    left: space["5"],
    color: vars.inkSoft,
    background: vars.glass.bg,
    backdropFilter: backdropFilters.panel,
    WebkitBackdropFilter: backdropFilters.panel,
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
    right: space["5"],
    color: vars.paper,
    background: vars.ink,
    border: "none",
    boxShadow: `0 8px 24px color-mix(in srgb, ${vars.status.error} 33%, transparent), inset 0 1px 0 rgba(255,255,255,0.18)`,
  },
]);
