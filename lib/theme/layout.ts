// Content-width scale for centered editorial pages. Use these instead of
// inlining pixel values when capping a column to a readable measure.
//   sm  – narrow reading column (forms, single-card flows)
//   md  – standard two-column overview
//   lg  – wide editorial (item detail, settings, library)
//   xl  – data-dense (calendar week view, multi-column grids)
export const contentWidths = {
  sm: 720,
  md: 960,
  lg: 1240,
  xl: 1480,
} as const;

export type ContentWidth = keyof typeof contentWidths;
