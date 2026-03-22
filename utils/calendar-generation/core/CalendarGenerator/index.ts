/**
 * CalendarGenerator Sub-functions
 *
 * Organized by processing phase:
 * - initialization: Input validation and initial event building
 * - template-processing: Template expansion and mask generation
 * - slot-building: Slot creation and location/category setup
 * - scheduling: Scheduling strategy and candidate preparation
 * - finalization: Final event assembly and output
 */

// Initialization
export { validateInput } from "./initialization/validateInput";
export { buildInitialEventArray } from "./initialization/buildInitialEventArray";

// Template Processing
export { expandTemplates } from "./template-processing/expandTemplates";

// Slot Building
export { buildLocationMap } from "./slot-building/buildLocationMap";
export { buildCategoryConstraints } from "./slot-building/buildCategoryConstraints";
export { buildPlannerCategoryMap } from "./slot-building/buildPlannerCategoryMap";

// Scheduling
export { prepareSchedulingContext } from "./scheduling/prepareSchedulingContext";
export { buildSchedulingStrategy } from "./scheduling/buildSchedulingStrategy";
export { prepareCandidates } from "./scheduling/prepareCandidates";

// Finalization
export { assembleFinalEvents } from "./finalization/assembleFinalEvents";
