/**
 * TimeSlotManager Sub-modules
 *
 * Domain-organized helper modules:
 * - travel: Travel time calculations and reservations
 * - converter: Travel slot to event conversion
 * - builder: Slot building from events and templates
 * - finder: Slot search and filtering
 * - reserver: Slot reservation and travel placement
 */

// Travel
export { TravelManager } from "./travel/TravelManager";

// Converter
export { TravelConverter } from "./converter/TravelConverter";

// Builder
export { SlotBuilder } from "./builder/SlotBuilder";

// Finder
export { SlotFinder } from "./finder/SlotFinder";

// Reserver
export { SlotReserver } from "./reserver/SlotReserver";
