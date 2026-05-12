// Tracks unmatched outbound legs to detect return trips.
// Each outbound A→B stays open until a matching return B→A is encountered,
// at which point the leg is consumed so a subsequent A→B is treated as fresh.
export function createLegTracker() {
  let openLegs: { from: string; to: string }[] = [];

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

  function reset() {
    openLegs = [];
  }

  return { track, reset };
}
