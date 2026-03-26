import { AvailableSlot } from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";

export type TravelContext = {
  prevLocation: string;
  nextLocation: string;
  placeAtStart: boolean;
  travelMinutes: number;
};

// Tracks unmatched outbound legs to detect return trips.
// Each outbound A→B stays open until a matching return B→A is encountered,
// at which point the leg is consumed so a subsequent A→B is treated as fresh.
function createLegTracker() {
  const openLegs: { from: string; to: string }[] = [];

  function findMirror(from: string, to: string): number {
    return openLegs.findLastIndex((t) => t.from === to && t.to === from);
  }

  // Returns true if this trip is a return (mirror consumed), false if new outbound.
  function track(from: string, to: string): boolean {
    const mirrorIdx = findMirror(from, to);
    if (mirrorIdx !== -1) {
      openLegs.splice(mirrorIdx, 1);
      return true;
    }
    openLegs.push({ from, to });
    return false;
  }

  return track;
}

/**
 * Creates a stateful resolver that determines travel direction and duration for
 * a given slot transition. The resolver must be created once per pass so that
 * outbound leg state is shared across all slot iterations.
 *
 * @param travelManager - Provides travel durations between locations.
 * @returns A per-slot resolver that returns a TravelContext, or null if no travel is needed.
 */
export function createTravelContextResolver(travelManager: TravelManager) {
  const tracker = createLegTracker();

  return function resolve(slot: AvailableSlot): TravelContext | null {
    const { prevLocationId: prevLocation, nextLocationId: nextLocation } = slot;
    if (!prevLocation || !nextLocation || prevLocation === nextLocation) return null;

    const placeAtStart = tracker(prevLocation, nextLocation);
    const travelMinutes = travelManager.getTravelTime(
      prevLocation,
      nextLocation,
      placeAtStart ? slot.start : slot.end,
    );
    if (travelMinutes <= 0) return null;

    return { prevLocation, nextLocation, placeAtStart, travelMinutes };
  };
}
