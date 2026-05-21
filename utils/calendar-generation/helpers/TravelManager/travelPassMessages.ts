/**
 * travelPassMessages
 *
 * Phrasebook for the decision/action strings emitted by preliminaryTravelPass.
 * Centralising them here keeps the dispatch code readable and lets the log
 * vocabulary be tuned without touching the control flow. Each entry is either
 * a literal string or an arrow function that takes the interpolation args
 * needed at the call site.
 *
 * Organisation: one top-level key per source function in
 * preliminaryTravelPass.ts. Within each, keys describe the decision branch or
 * action taken.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

export const M = {
  walker: {
    skipOccupiedOrTravel: (label: string) => `Current = ${label} → skip`,
  },

  handleAvailable: {
    outerGuardSkip: "Outer guard: prev == next — no transition, skip",
    outerGuardTransition: (travelMinutes: number) =>
      `Outer guard: transition prevLoc → nextLoc, travel = ${travelMinutes}min`,
    currentLargeEnough: (curDur: number, travelMinutes: number) =>
      `Current size (${curDur}min) ≥ travel (${travelMinutes}min) — place in current`,
    placeTravelInCurrentAction: (placeAtStart: boolean) =>
      `placeTravelInCurrent() (${placeAtStart ? "PlaceAtStart" : "PlaceAtEnd"})`,
    currentTooSmall: (curDur: number, travelMinutes: number) =>
      `Current size (${curDur}min) < travel (${travelMinutes}min) — too small`,
    nextIsTravelDecision:
      "Next = Travel (unexpected on forward walk) — untrack and skip",
    skipInconsistent: "skip (inconsistent state)",
    prevIsTravel: (travelIdx: number, label: string) =>
      `Prev = Travel at slots[${travelIdx}] (${label})`,
    nextAbsorbReplan: (nextType: string) =>
      `Next = ${nextType} — absorb prev travel and replan A→C`,
    prevSoft: (prevType: string) => `Prev = ${prevType} (soft predecessor)`,
    nextBleedAcross: (nextType: string) =>
      `Next = ${nextType} — bleed across prev/current/next`,
    bleedAcrossAction: "bleedAcrossPrevCurrentNext()",
    nextOccupiedBleedIntoPrev:
      "Next = Occupied — bleed into prev (may cascade backward)",
    prevOccupied: "Prev = Occupied (hard predecessor)",
    nextBleedIntoNext: (nextType: string) =>
      `Next = ${nextType} — bleed into next (may cascade forward)`,
    nextOccupiedFillCurrent: "Next = Occupied — fill current with alert",
    fillCurrentWithAlertAction: "fillCurrentWithAlert() (insufficientTravel)",
    unhandledCombination: "Unhandled prev/next combination — untrack and skip",
    skipUnhandled: "skip (unhandled case)",
  },

  handleCategory: {
    entryEdge: "Entry edge",
    exitEdge: "Exit edge",
  },

  handleCategoryEntryEdge: {
    outerGuardSkip: "Outer guard: prev == current — no transition, skip",
    noPrev: "No prev slot (i == 0) — skip",
    prevTravelEndsAtCurrent:
      "Prev = Travel ending at current location — already handled, skip",
    prevTravelUnexpectedDest:
      "Prev = Travel landing at unexpected location — skip",
    prevTravelMatchesPrevLoc:
      "Prev = Travel landing at slot.prevLocationId — fall through to placement",
    prevAvailableWithTravelAtPrevPrev: (prevPrevIdx: number) =>
      `Prev = Available with Travel at slots[${prevPrevIdx}] ending at current — already handled, skip`,
    prevAvailableNoMatchingTravel:
      "Prev = Available without matching Travel at slots[i-2] — skip",
    prevCategory:
      "Prev = Category — its exit edge handled the transition, skip",
    prevAnywhereOccupiedHandled: (lookbackIdx: number) =>
      `Prev = Anywhere Occupied(s); Travel at slots[${lookbackIdx}] already brought user to current — skip`,
    prevOccupiedFallThrough: "Prev = Occupied — fall through to placement",
    noActionFromResolve: "resolveCategoryEdge returned no action — skip",
    fitsAtHead: (curDur: number, travelMinutes: number) =>
      `Category size (${curDur}min) ≥ travel (${travelMinutes}min) — place at head`,
    placeAtHeadAction: "placeTravelAtCategoryHead()",
    bypassCascade: (curDur: number, travelMinutes: number) =>
      `Category size (${curDur}min) < travel (${travelMinutes}min) — bypass cascade`,
  },

  handleCategoryExitEdge: {
    outerGuardSkip: "Outer guard: current == next — no transition, skip",
    lastSlotFinal: "Last slot — mark isFinal",
    markFinalAction: "markCategoryFinal()",
    nextAvailableDeferred:
      "Next = Available — transition deferred to Available handler",
    nextCategoryBleedBoundary:
      "Next = Category — bleed across category boundary",
    noActionFromResolve: "resolveCategoryEdge returned no action — skip",
    nextOccupied: (label: string) => `Next = Occupied (${label})`,
    fitsAtTail: (curDur: number, travelMinutes: number) =>
      `Category size (${curDur}min) ≥ travel (${travelMinutes}min) — place at tail`,
    placeAtTailAction: "placeTravelAtCategoryTail()",
    prevTravelAbsorbReplan: (travelIdx: number, label: string) =>
      `Prev = Travel at slots[${travelIdx}] (${label}) — absorb + replan through category`,
    noPrevTravel: "No prev Travel — fill category tail or trespass",
    nextIsTravelDecision:
      "Next = Travel (unexpected on forward walk) — untrack and skip",
    skipInconsistent: "skip (inconsistent state)",
    unhandledNext: "Unhandled next type — skip",
  },

  bleedIntoPrev: {
    prevNotPlaceable: "Prev not placeable — fill current with alert",
    fillCurrentWithAlertAction: "fillCurrentWithAlert() (insufficientTravel)",
    overflowExceedsPrev: (overflow: number, prevDur: number) =>
      `Overflow (${overflow}min) > prev (${prevDur}min) — backward cascade`,
    actionConsumed: (label: string) =>
      `bleedIntoPrev(): fully consumed ${label} + filled current`,
    actionShortened: (label: string, consume: number) =>
      `bleedIntoPrev(): shortened ${label} by ${consume}min + filled current`,
  },

  bleedIntoNext: {
    nextNotPlaceable: "Next not placeable — fill current with alert",
    fillCurrentWithAlertAction: "fillCurrentWithAlert() (insufficientTravel)",
    overflowExceedsNext: (overflow: number, nextDur: number) =>
      `Overflow (${overflow}min) > next (${nextDur}min) — forward cascade`,
    actionConsumed: (label: string) =>
      `bleedIntoNext(): fully consumed ${label} + filled current`,
    actionShortened: (label: string, consume: number) =>
      `bleedIntoNext(): shortened ${label} by ${consume}min + filled current`,
  },

  fillCategoryTailOrTrespass: {
    trespassEnd: (travelMinutes: number, curDur: number) =>
      `Travel (${travelMinutes}min) ≥ category (${curDur}min) — trespass at end instead of visible travel`,
    trespassEndAction: (label: string) => `mark trespassingEnd on ${label}`,
    fillTailAction: (curDur: number, travelMinutes: number) =>
      `fillCategoryTailOrTrespass(): fill ${curDur}min of category tail with alert travel (needs ${travelMinutes}min)`,
  },

  absorbAndReplan: {
    missingOrigin:
      "Prev travel origin missing — fallback to fillCurrentWithAlert()",
    fillCurrentWithAlertAction: "fillCurrentWithAlert()",
    noTravelTime:
      "A→C travel time unavailable — fallback to fillCurrentWithAlert()",
    action: (absorbedLabels: string[], insufficient: boolean) =>
      `absorbAndReplan(): absorbed [${absorbedLabels.join(", ")}], placed new A→C travel${insufficient ? " (insufficient)" : ""}`,
  },

  absorbAndReplanThroughCategory: {
    missingOrigin:
      "Prev travel origin missing — fallback to fillCategoryTailOrTrespass()",
    noTravelTime:
      "A→C travel time unavailable — fallback to fillCategoryTailOrTrespass()",
    action: (absorbedLabels: string[], insufficient: boolean) =>
      `absorbAndReplanThroughCategory(): absorbed [${absorbedLabels.join(", ")}], placed new A→C travel through category${insufficient ? " (insufficient)" : ""}`,
  },

  bypassCategoryCascade: {
    header: "Cascade: bypassCategoryCascade() (forward, category entry)",
    noPinnedDestination:
      "No pinned destination after category — fallback to fillCategoryTailOrTrespass()",
    noTravelTime:
      "A→destination travel time unavailable — fallback to fillCategoryTailOrTrespass()",
    initialDestination: (travelMinutes: number) =>
      `Initial destination from nextPinnedLocation(): travel=${travelMinutes}min`,
    anchorHardStop: (idx: number, label: string) =>
      `anchor slots[${idx}] = ${label} → hard stop`,
    retargetOccupied: (newT: number) =>
      `retarget to Occupied's location, travel=${newT}min`,
    anchorAbortAvailable: (idx: number, label: string) =>
      `anchor slots[${idx}] = ${label} → abort cascade, trespass intermediate cats`,
    trespassedAction: (labels: string[]) =>
      `trespassed: [${labels.join(", ")}]`,
    anchorRetarget: (idx: number, label: string, newT: number) =>
      `anchor slots[${idx}] = ${label} → retarget, travel=${newT}min`,
    endAtSlotStart: (T: number, consumed: number, idx: number) =>
      `T (${T}min) ≤ consumed (${consumed}min) — end at slots[${idx}].start`,
    partialSplit: (idx: number, remaining: number) =>
      `partial split inside slots[${idx}] (consume ${remaining}min)`,
    anchorConsume: (idx: number, label: string, slotDur: number) =>
      `anchor slots[${idx}] = ${label} → consume (${slotDur}min) and continue`,
    action: (
      absorbedLabels: string[],
      insufficient: boolean,
      overconstrained: boolean,
    ) =>
      `bypassCategoryCascade(): absorbed [${absorbedLabels.join(", ")}], placed A→destination travel${insufficient ? " (insufficient)" : ""}${overconstrained ? " (overconstrained)" : ""}`,
  },

  backwardBypassCascade: {
    header: "Cascade: backwardBypassCascade() (walking i-1, i-2, ...)",
    anchorHardStopOccupied: (idx: number, label: string) =>
      `anchor slots[${idx}] = ${label} → hard stop (location-pinned Occupied)`,
    anchorAnywherePassThrough: (idx: number, label: string) =>
      `anchor slots[${idx}] = ${label} → pass through (Anywhere)`,
    anchorTryAbsorbTravel: (idx: number, label: string) =>
      `anchor slots[${idx}] = ${label} → try absorb earlier Travel into direct A→C`,
    directFits: (TDirect: number, regionMinutes: number) =>
      `direct A→destination (${TDirect}min) fits in region (${regionMinutes}min) ✓`,
    directDoesNotFit: (TDirect: number, regionMinutes: number) =>
      `direct A→destination (${TDirect}min) > region (${regionMinutes}min) ✗`,
    travelAbsorbAction: (absorbedLabels: string[]) =>
      `backwardBypassCascade() (Travel absorb): absorbed [${absorbedLabels.join(", ")}], placed merged A→destination travel`,
    noViableAbsorb: "no viable absorb — fallback bleed into prev",
    fallbackPrevAction: "cascadeFallbackPrev() (insufficient)",
    anchorAbortAvailable: (idx: number, label: string) =>
      `anchor slots[${idx}] = ${label} → abort cascade, fallback bleed into prev`,
    anchorCategoryMatches: (idx: number, label: string) =>
      `anchor slots[${idx}] = ${label} → location matches destination, skip`,
    anchorCategoryNoTravel: (idx: number, label: string) =>
      `anchor slots[${idx}] = ${label} → travel time unavailable, skip`,
    anchorCategoryFits: (
      idx: number,
      label: string,
      T: number,
      slotDuration: number,
    ) =>
      `anchor slots[${idx}] = ${label} → try anchor→destination (${T}min): span ${slotDuration}min ≥ ${T}min ✓ fits`,
    anchorCategoryDoesNotFit: (
      idx: number,
      label: string,
      T: number,
      slotDuration: number,
    ) =>
      `anchor slots[${idx}] = ${label} → span ${slotDuration}min < ${T}min ✗ skip`,
    action: (absorbedLabels: string[], overconstrained: boolean) =>
      `backwardBypassCascade(): absorbed [${absorbedLabels.join(", ")}], placed anchor→destination travel${overconstrained ? " (overconstrained)" : ""}`,
    noAnchorFits: "No anchor fit — fallback bleed into prev",
  },

  forwardBypassCascade: {
    header: "Cascade: forwardBypassCascade() (walking i+1, i+2, ...)",
    anchorHardStop: (idx: number, label: string) =>
      `anchor slots[${idx}] = ${label} → hard stop`,
    retargetOccupied: (newT: number) =>
      `retarget to Occupied's location, travel=${newT}min`,
    anchorAbortAvailable: (idx: number, label: string) =>
      `anchor slots[${idx}] = ${label} → abort cascade, fillCurrentWithAlert()`,
    fillCurrentWithAlertAction: "fillCurrentWithAlert() (insufficientTravel)",
    anchorRetarget: (idx: number, label: string, newT: number) =>
      `anchor slots[${idx}] = ${label} → retarget, travel=${newT}min`,
    endAtSlotStart: (T: number, consumed: number, idx: number) =>
      `T (${T}min) ≤ consumed (${consumed}min) — end at slots[${idx}].start`,
    partialSplit: (idx: number, remaining: number) =>
      `partial split inside slots[${idx}] (consume ${remaining}min)`,
    anchorConsume: (idx: number, label: string, slotDur: number) =>
      `anchor slots[${idx}] = ${label} → consume (${slotDur}min) and continue`,
    action: (
      absorbedLabels: string[],
      insufficient: boolean,
      overconstrained: boolean,
    ) =>
      `forwardBypassCascade(): absorbed [${absorbedLabels.join(", ")}], placed A→destination travel${insufficient ? " (insufficient)" : ""}${overconstrained ? " (overconstrained)" : ""}`,
  },

  bleedAcrossCategoryBoundary: {
    trespassBoundary: (half: number) =>
      `Symmetric bleed (${half}min each) ≥ a category — trespass boundary instead`,
    trespassAction: (currentLabel: string, nextLabel: string) =>
      `trespassed: [${currentLabel}.end, ${nextLabel}.start]`,
    action: (
      bleedCurrent: number,
      currentConsumed: boolean,
      currentLabel: string,
      nextConsumed: boolean,
      nextLabel: string,
    ) =>
      `bleedAcrossCategoryBoundary(): symmetric bleed ${bleedCurrent}min each side, ${currentConsumed ? `consumed ${currentLabel}` : "shortened current"}, ${nextConsumed ? `consumed ${nextLabel}` : "shortened next"}`,
  },
} as const;
