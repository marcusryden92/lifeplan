
TRAVEL CRITERIA — NEW SLOT MODEL (CategorySlot with currentLocationId)
======================================================================

Slot types now (in the unified slots array):
    Available  — free time outside any category
                 fields: prevLocationId, nextLocationId
    Category   — inside a category period
                 fields: currentLocationId, prevLocationId, nextLocationId,
                         categoryId, isStrictCategory
    Occupied   — fixed event
    Travel     — already-placed travel block

Available fragments adjacent to a category are TRANSPARENT (prev == next) so
the dispatcher does not double-place a transition the category already owns.
The category owns the transitions at its edges.


For each slot, walking forwards.

Outer guards (skip slot if any):
    Current type: Occupied                                  -> skip
    Current type: Travel                                    -> skip (already placed)
    Current type: Available, duration <= 0                  -> skip
    Current type: Available, startLoc == endLoc             -> skip (no transition)
    Current type: Available, startLoc == null or endLoc == null  -> skip
    Current type: Category, no entry AND no exit transition -> skip
        (i.e. prev == currentLocationId AND currentLocationId == next)

Where for Available:
    startLoc = prevLocationId
    endLoc   = nextLocationId
Where for Category, the slot may have UP TO TWO transitions evaluated
independently:
    entry transition:  prevLocationId    -> currentLocationId  (place at slot START)
    exit  transition:  currentLocationId -> nextLocationId     (place at slot END)
One, both, or neither may fire.


For Available slots only — legTracker direction:
    Direction = legTracker.track(startLoc, endLoc)
        outbound -> place at slot END
        return   -> place at slot START

Category transitions are NOT routed through legTracker. They are direction-fixed:
    entry  -> place at slot START
    exit   -> place at slot END


============================================================
PRE-CHECK: Category Layover Bypass
============================================================
Only applies when current is Category.
Conditions:
    - current is Category at location L (currentLocationId = L)
    - next is Available, transitions toward destination D where D != L
    - travel(originLoc -> D) duration is shorter than
        travel(originLoc -> L) + L-stay + travel(L -> D)
    - travel(originLoc -> D) fits within current + next combined
Where originLoc = whatever the user's location is at current.start
                  (prev event's loc if prev is occupied, prev slot's endLoc otherwise)

    Conditions met
        -> Absorb current + next into one travel(originLoc -> D)
           Mark travel with bypassed: true
           Skip ahead 2 slots
    Conditions not met
        -> Fall through to main tree


============================================================
MAIN TREE
============================================================

Current type: Available
==========================
A single transition inside the slot: startLoc -> endLoc.

    Current size: LARGE ENOUGH for travel
    -------------------------------------
        Current is uncategorized (Available is by definition uncategorized in
        the new model — this branch is the same as the old "uncategorized" case)
            -> PlaceAtStart (return) | PlaceAtEnd (outbound)

        (The old "categorized AvailableSlot" branch is gone — those slots are
         now Category and handled in the Current type: Category section.)

    Current size: NOT LARGE ENOUGH for travel
    -----------------------------------------

        Prev type: Available

            Next type: Available
                Symmetric 3-slot bleed fits
                (prev.tail >= overflow/2 AND next.head >= overflow/2,
                 where overflow = travel - current)
                    -> Symmetric bleed: eat overflow/2 from prev.tail,
                       fill current, eat overflow/2 from next.head

                Symmetric doesn't fit, but asymmetric does
                (prev + current + next >= travel)
                    -> Fill current
                    -> Fill smaller of (prev.tail | next.head) completely
                    -> Eat remainder from the larger

                Neither fits (travel > prev + current + next)
                    (Future: expand window to [prev-1, prev, current, next, next+1],
                             apply symmetric/asymmetric to 5 slots, then 7, etc.
                             Stop expanding at any occupied slot.)
                    -> ALERT over [prev, current, next]

            Next type: Occupied
                Travel fits in prev + current
                    -> Fill current, remainder eats from prev.tail

                Travel too big
                    (Future: walk prev-1, prev-2... until covered or hit occupied)
                    -> ALERT over [prev, current]

            Next type: Category
                Same as Next type: Available
                (Category leftovers absorb bleed the same way as Available.
                 The category's own entry/exit transitions are evaluated on
                 its own pass — they do not block bleed from a neighbor.)

            Next type: Travel
                -> Shouldn't happen going forward
                   (we always advance past placed travel)


        Prev type: Occupied

            Next type: Available
                Travel fits in current + next
                    -> Fill current, remainder eats from next.head

                Travel too big
                    (Future: walk next+1, next+2... until covered or hit occupied)
                    -> ALERT over [current, next]

            Next type: Occupied
                -> ALERT over [current] alone (no bleed possible either direction)

            Next type: Category
                Same as Next type: Available

            Next type: Travel
                -> Shouldn't happen


        Prev type: Category
            Same as Prev type: Available
            (Category leftover before this Available is a normal bleed donor.
             Eating into its tail does NOT change its own entry/exit decisions;
             those are evaluated on the category's own pass.)


        Prev type: Travel
            // Prev is an existing travel from earlier this pass: travel(X -> Y)
            // Current transition is Y -> Z
            // Try to bridge: replace prev with single travel(X -> Z) spanning [prev, current]

            newTravel = travel(X -> Z) duration

            newTravel fits in [prev.start, current.end]
                -> Absorb prev, emit single travel(X -> Z) spanning prev + current

            newTravel too big for [prev + current]
                -> Absorb prev, ALERT over [prev, current]



Current type: Category
==========================
Up to two independent transitions: entry at slot start, exit at slot end.
Evaluate ENTRY first, then EXIT. Each is its own placement problem with its
own neighbors and bleed eligibility.


    Entry transition: prevLocationId -> currentLocationId
    -----------------------------------------------------
    Skip if prev == currentLocationId (no entry travel needed).

        Current size: LARGE ENOUGH for entry travel
            -> PlaceAtStart of category (eat travel from category's HEAD)

        Current size: NOT LARGE ENOUGH for entry travel
            Prev type: Available
                Symmetric bleed fits (prev.tail >= overflow/2 AND current.head >= overflow/2)
                    -> Symmetric bleed across [prev, current]
                Symmetric doesn't fit, asymmetric does
                    -> Fill current's head, remainder eats prev.tail
                Neither fits
                    -> ALERT over [prev, current]

            Prev type: Occupied
                Travel fits within current alone (this is the size check above —
                if we got here it does not, by definition)
                Travel too big
                    -> ALERT over [current] alone (no bleed donor)

            Prev type: Category
                // Two categories meeting at a boundary with different locations.
                // Both signal the SAME transition: prev cat's exit == this cat's entry.
                // Evaluate symmetrically across the boundary.
                Symmetric fits (prev.tail >= travel/2 AND current.head >= travel/2)
                    -> Place travel symmetrically across boundary
                       (eat travel/2 from prev cat's tail, travel/2 from current cat's head)

                Symmetric doesn't fit, asymmetric does
                (one side has < travel/2 but combined prev.tail + current.head >= travel)
                    -> Fill smaller side completely
                    -> Eat remainder from the larger side

                Asymmetric doesn't fit
                    -> ALERT over [prev, current]

            Prev type: Travel
                Same as in the Available section: try to bridge by absorbing
                prev travel and emitting one travel(X -> currentLocationId)
                across [prev, current's head].
                newTravel fits  -> Absorb prev, emit bridge
                newTravel too big -> Absorb prev, ALERT over [prev, current]


    Exit transition: currentLocationId -> nextLocationId
    ----------------------------------------------------
    Skip if currentLocationId == next (no exit travel needed).
    Evaluate AFTER any entry travel has been placed — current may have shrunk.

        Current size (after any entry placement): LARGE ENOUGH for exit travel
            -> PlaceAtEnd of category (eat travel from category's TAIL)

        Current size: NOT LARGE ENOUGH for exit travel
            Next type: Available
                Same as the Available section's symmetric / asymmetric / alert
                math, with current's tail and next's head as donors.

            Next type: Occupied
                Travel fits in current's tail alone (covered by the size check)
                Travel too big
                    -> ALERT over [current] alone

            Next type: Category
                // Cat-to-cat boundary, same as the Entry / Prev=Category case
                // but mirrored. Evaluate symmetrically across the boundary.
                // Note: this is the same boundary the next cat will evaluate
                // as its own entry — dispatcher must take care not to
                // double-place. Use a "boundary owned by the trailing cat's
                // exit pass" rule, OR detect that the next cat's entry has
                // already been placed and skip.
                Symmetric fits
                    -> Place travel symmetrically across boundary
                Asymmetric fits
                    -> Fill smaller, remainder from larger
                Doesn't fit
                    -> ALERT over [current, next]

            Next type: Travel
                -> Shouldn't happen



============================================================
ALERT
============================================================
When a branch terminates in ALERT:

    Window = [earliest slot start, latest slot end] from the bleed attempt
             bounded by occupied slots on either side

    Replace all available / category slots in the window with one travel block:
        start  = window.start
        end    = window.end
        from   = startLoc of original transition
        to     = endLoc of original transition (the true destination)
        insufficientTravel: true
        requiredTravelMinutes = original travel duration

    For each category slot overlapped by the alert travel:
        Push a CategoryBoundaryTrespass entry
            boundary = "start" if window swallows category's head,
                       "end"   if window swallows category's tail,
                       both    if it swallows the middle

    Categories fully covered by an alert travel are visually "lost" —
    the scheduler must not place tasks into time covered by alert travel.
    (Future: explicit gray-out flag on the cat wrapper.)


============================================================
INVARIANTS (after every action)
============================================================
1. slots[] sorted by start, no overlaps
2. Available leftovers have correct startLoc / endLoc:
    Pre-leftover  (before travel): startLoc unchanged, endLoc = travel.from
    Post-leftover (after travel):  startLoc = travel.to, endLoc unchanged
3. Category leftovers carved out of a CategorySlot keep
    currentLocationId, categoryId, isStrictCategory unchanged.
4. Travel slots carved out of a category slot carry categoryId + isStrictCategory
5. legTracker.track() is called exactly once per Available slot with a
   non-trivial transition. Category entry/exit do NOT consult legTracker.


============================================================
KNOWN GAP — resolved by the new slot model
============================================================
Old gap: an occupied event at location A directly followed (no gap) by a
category at location B silently dropped the A -> B transition, because the
single AvailableSlot field could only encode one transition.

The new model encodes this honestly: the CategorySlot has
    prevLocationId = A,   currentLocationId = B,   nextLocationId = ...
so the dispatcher's "Current type: Category, Entry transition" branch fires
on prev != current and places A -> B at the category's head, eating from
the cat's start. No silent drop.


============================================================
FUTURE EXTENSIONS (placeholder markers)
============================================================
- 5-slot, 7-slot bleed windows (expand outward when 3-slot insufficient)
- Multi-step backward walk (prev=occupied + next=occupied + insufficient -> walk further)
- Multi-step forward walk (mirror)
- Cascading prev-travel absorption (3+ chained legs into one)
- Cancel/gray-out category slots fully covered by alert travel
- Overlapping category periods (splitter currently drops later overlaps)
