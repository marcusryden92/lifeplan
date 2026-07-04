// Theme-independent numeric scales. These do not change between light/dark,
// so they live outside the vars contract as plain constants. Both sprinkles
// (for atomic props) and style() blocks import from here — this is the single
// source of truth for space, radius, breakpoint, border-width, z-index, and
// content-width vocabulary across the app.

export const space = {
  none: 0,
  px: 1,
  "0.5": 2,
  "1": 4,
  "1.5": 6,
  "2": 8,
  "2.5": 10,
  "3": 12,
  "3.5": 14,
  "4": 16,
  "5": 20,
  "6": 24,
  "7": 28,
  "8": 32,
  "10": 40,
  "12": 48,
  "14": 56,
  "16": 64,
  "20": 80,
} as const;

// Radius scale — the base tiers (xs/sm/md/lg/xl/2xl/3xl) are the "snap-to"
// palette for chips, buttons, cards, and panels. The `+2` half-steps
// (10, 14, 18, 22) exist because the shared recipes (glass, popover)
// intentionally sit a couple pixels rounder than a plain card at the same
// "size" tier — that softness is part of the frosted-panel identity. Prefer
// the base tiers for new leaf components; reach for the half-steps only
// inside recipe variants that need to differentiate a floating surface from
// a static one.
export const radii = {
  none: 0,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  // Half-steps for glass/popover surface differentiation.
  "sm+2": 10,
  "md+2": 14,
  "lg+2": 18,
  "xl+2": 22,
  pill: 999,
} as const;

// Content-width scale for layouts and text measures.
//   xs   — feature/CTA copy
//   sm   — comfortable reading measure
//   md   — display heading measure
//   lg   — hero headline
//   xl   — page-level content container (item detail)
//   2xl  — widest layout (landing wide grid)
export const contentWidth = {
  xs: 520,
  sm: 640,
  md: 820,
  lg: 960,
  xl: 1240,
  "2xl": 1280,
} as const;

// Breakpoint values (in pixels). Layouts are mobile-first; each breakpoint is
// the *maximum* width at which the smaller layout still applies. So
// `mobile: 767` means "mobile up to 767px" and tablet/desktop start at 768.
// `laptop: 1279` marks the boundary below which a persistent side column
// (sidebar + 340px engine console + a usable week grid) no longer fits;
// surfaces that dock a wide side panel switch it to an overlay under this.
export const breakpoints = {
  mobile: 767,
  tablet: 1023,
  laptop: 1279,
} as const;

// Prebuilt media query strings. Use inside `@media` keys in vanilla-extract
// style() blocks: `"@media": { [media.mobile]: { ... } }`.
export const media = {
  mobile: `screen and (max-width: ${breakpoints.mobile}px)`,
  tablet: `screen and (max-width: ${breakpoints.tablet}px)`,
  laptop: `screen and (max-width: ${breakpoints.laptop}px)`,
  tabletUp: `screen and (min-width: ${breakpoints.mobile + 1}px)`,
  desktopUp: `screen and (min-width: ${breakpoints.tablet + 1}px)`,
  wideUp: `screen and (min-width: ${breakpoints.laptop + 1}px)`,
} as const;

// Border-width scale. `hairline` is the app's default 1px rule (85+ uses);
// `medium` is used for accent underlines and focus rings; `thick` is for
// the editable-title border and heavier emphasis marks.
export const borderWidth = {
  none: 0,
  hairline: 1,
  medium: 2,
  thick: 3,
} as const;

// Semantic z-index layers. Each named tier reserves a numeric band; local
// stacking within a layer uses ordinary CSS stacking (no z-index needed).
// Ordering rationale:
//   base     — default flow, backdrops
//   docked   — mobile tabs, sticky headers within scroll containers
//   raised   — small overlays inside a card
//   floating — FloatingUI-style popovers anchored to content
//   palette  — shell-level palettes (search, capture)
//   popoverOverPalette — pickers spawned from within a palette
//   modal    — dialogs / confirm modals (block palettes and popovers)
//   modalOver — modals spawned from within a modal (e.g. edit-location
//               opened from another dialog)
//   toast    — future toast surface (top of everything)
export const zIndex = {
  base: 0,
  docked: 5,
  raised: 10,
  floating: 30,
  palette: 50,
  popoverOverPalette: 60,
  modal: 100,
  modalOver: 150,
  toast: 200,
} as const;

export type Space = typeof space;
export type Radii = typeof radii;
export type ContentWidth = typeof contentWidth;
export type Breakpoints = typeof breakpoints;
export type Media = typeof media;
export type BorderWidth = typeof borderWidth;
export type ZIndex = typeof zIndex;
