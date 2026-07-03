import { style } from "@vanilla-extract/css";
import { vars, themeTransition, radii, zIndex } from "@/lib/theme";

export const MODAL_FADE_MS = 220;

// Fills the AppShell main column (the mount point is the assistantSlot inside
// mainColumn), leaving the sidebar visible and interactive. Sits above page
// content but below the Capture/Search palettes (zIndex.palette).
export const overlay = style({
  position: "absolute",
  inset: 0,
  zIndex: zIndex.floating,
  display: "flex",
  opacity: 0,
  transition: `opacity ${MODAL_FADE_MS}ms ease`,
  selectors: {
    "&[data-state='open']": { opacity: 1 },
  },
});

export const modal = style({
  position: "absolute",
  inset: 0,
  zIndex: zIndex.floating + 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  isolation: "isolate",
  padding: 0,
  background: vars.paper,
  opacity: 0,
  transform: "translateY(8px) scale(0.995)",
  transition: `${themeTransition}, opacity ${MODAL_FADE_MS}ms ease, transform ${MODAL_FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  selectors: {
    "&[data-state='open']": {
      opacity: 1,
      transform: "translateY(0) scale(1)",
    },
  },
});

export const banner = style({
  position: "relative",
  zIndex: 1,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "8px 22px",
  background: vars.ink,
  color: vars.paper,
  transition: themeTransition,
});

export const editingLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: `color-mix(in srgb, ${vars.paper} 65%, transparent)`,
  transition: themeTransition,
});

export const bannerTitle = style({
  fontFamily: vars.font.ui,
  fontSize: 12.5,
  fontWeight: 500,
  color: `color-mix(in srgb, ${vars.paper} 85%, transparent)`,
  transition: themeTransition,
});

export const bannerSpacer = style({ flex: 1 });

// Doubled selector (`&&`) beats the `pillBtn` recipe on specificity so the
// paper-tinted overrides win on top of `variant="glass"`, matching
// WeekStructureModal's cancel button treatment.
export const cancelButtonStyle = style({
  selectors: {
    "&&": {
      background: `color-mix(in srgb, ${vars.paper} 14%, transparent)`,
      border: `1px solid color-mix(in srgb, ${vars.paper} 40%, transparent)`,
      color: vars.paper,
    },
    "&&:hover:not(:disabled)": {
      background: `color-mix(in srgb, ${vars.paper} 22%, transparent)`,
      borderColor: `color-mix(in srgb, ${vars.paper} 55%, transparent)`,
    },
  },
});

export const body = style({
  position: "relative",
  zIndex: 1,
  flex: 1,
  display: "flex",
  minHeight: 0,
  overflow: "hidden",
});

export const chatPane = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  minWidth: 240,
  padding: "14px 18px",
  // Subtle darker surface behind the chat — makes the assistant text and
  // composer sit on a differentiated surface without breaking the modal's
  // paper theme. Auto-adapts per light/dark: in light mode we tint toward
  // ink, in dark mode this reads as a slightly deeper paper.
  background: `color-mix(in srgb, ${vars.ink} 4%, ${vars.paper})`,
  transition: themeTransition,
});

export const treePane = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  minWidth: 240,
  padding: "14px 18px",
});

// Drag handle between the two panes. Thin bar with a wider hover target and
// a col-resize cursor. Sits inside `.body` (which is display: flex).
export const paneDivider = style({
  position: "relative",
  flex: "0 0 4px",
  cursor: "col-resize",
  background: vars.rule,
  transition: themeTransition,
  selectors: {
    "&:hover, &[data-dragging='true']": {
      background: vars.accent.primary,
    },
  },
});

export const paneHeader = style({
  display: "flex",
  alignItems: "baseline",
  gap: 12,
  marginBottom: 8,
  flexShrink: 0,
});

export const paneTitle = style({
  fontFamily: vars.font.display,
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  margin: 0,
  transition: themeTransition,
});

export const paneSubtitle = style({
  fontFamily: vars.font.ui,
  fontSize: 11.5,
  color: vars.inkSoft,
  fontVariantNumeric: "tabular-nums",
});

export const chatPlaceholder = style({
  flex: 1,
  minHeight: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  borderRadius: radii["md+2"],
  border: `1px dashed ${vars.rule}`,
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontSize: 12,
  textAlign: "center",
});

export const a11yHiddenTitle = style({
  position: "absolute",
  left: -10000,
});
