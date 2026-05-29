// Single source of truth for transition durations (in seconds).
// Tweak any value here to retune that category of motion across the app.
export const DURATIONS = {
  // Light/dark color, border, shadow swaps.
  theme: 1,

  // Button hover/state changes (color shifts when entering/leaving hover).
  buttonState: 1,

  // :active press scale feedback on buttons.
  press: 0.12,

  // Sidebar collapse, label fade, panel slide-in animations.
  collapse: 0.2,

  // Modal/dialog/sheet entrance.
  modal: 0.18,

  // Progress bar width fills.
  progress: 0.25,
} as const;

// Theme-driven properties (the ones that swap when light/dark toggles).
const themeProperties = [
  "background-color",
  "color",
  "border-color",
  "box-shadow",
  "fill",
  "stroke",
];

// ---- Composed transition strings ----

// For elements whose only animated change is the theme (canvas, glass, badges).
export const themeTransition = themeProperties
  .map((p) => `${p} ${DURATIONS.theme}s ease`)
  .join(", ");

// For interactive buttons — press feedback + theme color swaps.
// (State changes use the same color properties as theme, so they share timing.)
export const buttonTransition = `transform ${DURATIONS.press}s ease, ${themeTransition}`;

// For sidebar + any collapsible row — width/max-width/opacity/padding/gap
// animate together with theme colors.
export const collapseTransition = [
  `width ${DURATIONS.collapse}s ease`,
  `max-width ${DURATIONS.collapse}s ease`,
  `opacity ${DURATIONS.collapse}s ease`,
  `padding ${DURATIONS.collapse}s ease`,
  `gap ${DURATIONS.collapse}s ease`,
  `transform ${DURATIONS.collapse}s ease`,
  themeTransition,
].join(", ");

// For progress bar width fills.
export const progressTransition = `width ${DURATIONS.progress}s ease`;

// Back-compat alias for the previously exported TRANSITION_SPEED.
export const TRANSITION_SPEED = DURATIONS.theme;
