import { style } from "@vanilla-extract/css";
import { vars, backdropFilters, buttonTransition } from "@/lib/theme";

// Pill button that wears the Caption+kbd command-palette aesthetic: same
// pill shape and glass/solid chrome as the standard Button, but with
// uppercase tracked text and a slim kbd badge sitting alongside the label.
// Clickable for mouse users; the kbd communicates the keyboard shortcut.
export const hintAction = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 14px",
  borderRadius: 999,
  cursor: "pointer",
  border: "1px solid transparent",
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.10em",
  transition: buttonTransition,
  selectors: {
    "&:active": { transform: "scale(0.98)" },
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
  },
});

// Glass variant — secondary action (Cancel-style). Mirrors pillBtn.glass.
export const hintActionGlass = style({
  background: vars.glass.bgDeep,
  backdropFilter: backdropFilters.button,
  WebkitBackdropFilter: backdropFilters.button,
  border: `1px solid ${vars.glass.stroke}`,
  boxShadow: `inset 0 1px 0 ${vars.glass.hi}`,
  color: vars.ink,
});

// Solid variant — primary action (Create / Confirm). Mirrors pillBtn.solid.
export const hintActionSolid = style({
  background: vars.ink,
  color: vars.paper,
});

// Kbd badge alongside the label. Background tints differ between glass and
// solid variants so the badge stays legible on either chrome.
export const hintActionKbd = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 18,
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  fontWeight: 600,
  borderRadius: 6,
  padding: "2px 6px",
  letterSpacing: 0,
  textTransform: "none",
});

export const hintActionKbdGlass = style({
  color: vars.inkSoft,
  background: vars.glass.bgSoft,
  border: `1px solid ${vars.rule}`,
});

export const hintActionKbdSolid = style({
  color: vars.paper,
  background: "rgba(255,255,255,0.10)",
  border: `1px solid rgba(255,255,255,0.18)`,
});
