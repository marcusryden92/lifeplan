# preliminaryTravelPass — Decision Tree

A reference for the dispatch and ladder logic in
[utils/calendar-generation/helpers/TravelManager/preliminaryTravelPass.ts](../utils/calendar-generation/helpers/TravelManager/preliminaryTravelPass.ts).

## Signature

```
preliminaryTravelPass(
  hasPlannerLocationMap:      boolean,
  categoryConstraints:        Category[],
  occupiedSlots:              (OccupiedSlot | TravelSlot)[]      [MUTATED]
  travelManager:              TravelManager,
  bufferTimeMinutes:          number,
  slots:                      AvailableSlot[]                    [partially mutated]
  categoryBoundaryTrespasses: CategoryBoundaryTrespass[] = []    [MUTATED]
): AvailableSlot[]   // new array of remaining available gaps
```

- `slots` → "where can we still put things?" Returned as a new array (`result`).
  In-place mutations happen only on `slots[i+1]` for strategies that need the
  next iteration to see a trimmed version (centering, bypass-trim, extend-forward).
- `occupiedSlots` → "what's already placed?" Travel events get appended.
- `categoryBoundaryTrespasses` → render hints for too-tight category boundaries.

## Top-level dispatch

```
preliminaryTravelPass(slots, ...)
        │
        ▼
   hasPlannerLocationMap? ──NO──► return slots unchanged
        │
       YES
        │
        ▼
   for each slot[i]:
        │
        ├─ slot.durationMinutes <= 0 ──► skip (i += 1)
        │
        ├─ resolveTravel(slot) → null (no transition)
        │  └─ push slot to result (i += 1)
        │
        └─ travel resolved
              │
              ├─ placeAtSlotStart = true  (return trip) ──► handleReturn
              │
              └─ placeAtSlotStart = false (outbound)    ──► handleOutbound
```

`resolveTravel` returns `null` when `prev === next`, when either side is `null`,
or when computed travel time is `<= 0`. For slots **inside a category**, it
forces `placeAtSlotStart = false` (cat slots are always outbound — see
`TravelManager.resolveTravel`).

## handleOutbound ladder

First step whose precondition matches wins. All time comparisons happen in
**milliseconds** to handle fractional travel-time values (e.g. 18.1 min) —
relying on the floored `slot.durationMinutes` misclassifies exact fits as
overflows.

```
handleOutbound(slot, slots, slotIndex, ...)
   │
   ├──[1]── tryBypassOutboundCategoryLayover ─────────────────────────┐
   │         eligibility:                                              │
   │           • this slot is NOT a category                           │
   │           • next slot IS a contiguous category                    │
   │           • next slot heads onward to a 3rd location              │
   │           • next slot is inside (not at end of) its period        │
   │         decide (either trigger fires):                            │
   │           A. category slot too small for its own outgoing travel  │
   │           B. combined span too tight for both hops + buffer       │
   │         emit:                                                     │
   │           A → direct travel at span END     (consumes 2 slots)    │
   │           B → direct travel at span START,  (consumes 1 slot,     │
   │               trims next cat slot in place    next iteration      │
   │                                                processes trimmed) │
   │         OR ALL FAIL → fall through to step 2                      │
   ▼
   ├──[2]── center-on-boundary (cat-to-cat clean fit) ────────────────┐
   │         eligibility:                                              │
   │           • this slot has categoryId                              │
   │           • next slot has categoryId                              │
   │           • next slot is contiguous (start == this.end)           │
   │           • travel/2 fits in BOTH this slot and next slot (ms)    │
   │         emit:                                                     │
   │           travel straddles the boundary, half in each category    │
   │           (consumes 1 slot; trims next cat slot in place)         │
   │         else → fall through to step 3                             │
   ▼
   ├──[3]── travelMs < slotMs   (fits with leftover) ─────────────────┐
   │         placeTravelAtSlotEnd:                                     │
   │           travel at slot end, available time at slot start        │
   ▼
   ├──[4]── travelMs == slotMs  (exact fit) ──────────────────────────┐
   │         tryShiftTravelBackward (allow=true)                       │
   │           ▸ may shift into a category previous slot (allowed in   │
   │             exact-fit case so the buffer between travel and the   │
   │             next event is preserved).                              │
   │           SUCCESS → done                                          │
   │         if slot has categoryId:                                   │
   │           push trespass marker (boundary "end"), keep slot        │
   │         else:                                                     │
   │           placeTravelAtSlotEnd (fills the slot exactly)           │
   ▼
   └──[5]── travelMs > slotMs   (overflow) ───────────────────────────┐
             tryShiftTravelBackward (allow=false)                      │
               ▸ REFUSES to shift into a category previous slot —      │
                 oversized travel would consume too much cat time.     │
               ▸ Also refuses when both this slot and prev are non-cat │
                 (no category context to bind them).                   │
               SUCCESS → done                                          │
             tryExtendForwardIntoCategory                              │
               ▸ Only when next slot is a contiguous category;         │
                 places travel from slot.start past slot.end into the  │
                 next cat (trims its start in place).                  │
               SUCCESS → done                                          │
             if slot has categoryId:                                   │
               push trespass marker (boundary "end"), keep slot        │
             else:                                                     │
               pushInsufficientTravel (red marker filling slot)        │
```

## handleReturn ladder

Return trips don't have a backward-shift strategy (return travel must land at
the slot's start to "arrive" at the slot's location, so shifting earlier
would put us at the wrong place during the prior slot).

```
handleReturn(slot, slots, slotIndex, ...)
   │
   ├──[1]── tryBypassReturnCategoryLayover ───────────────────────────┐
   │         eligibility:                                              │
   │           • this slot HAS a categoryId                            │
   │           • return travel longer than this category slot's        │
   │             duration (the layover itself is too tight)            │
   │           • next slot is a contiguous non-category                │
   │           • next slot starts at this category's location and      │
   │             continues onward to a 3rd location                    │
   │         emit:                                                     │
   │           single direct foreign → destination travel at the       │
   │           span START; available leftover (if any) lands at the    │
   │           destination location                                    │
   │           (consumes 2 slots)                                      │
   ▼
   ├──[2]── slot.categoryId AND travelMs >= slotMs ───────────────────┐
   │         push trespass marker (boundary "start"), keep slot        │
   │         (skip emit — wrapper top renders red instead)             │
   ▼
   └──[3]── placeTravelAtSlotStart ───────────────────────────────────┐
             travel <= slot → emit travel at slot start,               │
                              available leftover at end                │
             travel >  slot → emit insufficient travel filling slot    │
                              (red marker)                             │
```

## Side-effect summary per strategy

```
strategy                                  occupiedSlots  result         slots
                                          (travel push)  (avail push)   (mutate?)
─────────────────────────────────────────────────────────────────────────────────
no transition                                no            yes            no
bypass outbound (span END)                   yes           maybe          no
bypass outbound (span START + trim)          yes           no             trims slots[i+1]
bypass return                                yes           maybe          no
center on boundary                           yes           maybe          trims slots[i+1]
placeTravelAtSlotEnd                         yes           maybe          no
placeTravelAtSlotStart                       yes           maybe          no
tryShiftTravelBackward (success)             yes           mutates last   no
                                                           result entry
tryExtendForwardIntoCategory (success)       yes           no             trims slots[i+1]
trespass marker                              no            yes (slot      no
                                                           kept as-is)
pushInsufficientTravel                       yes (insuff.) no             no
```

Whenever the strategy "consumes 2 slots," `processSlot` returns `2` so the
outer loop skips the next index. Otherwise it returns `1`.
