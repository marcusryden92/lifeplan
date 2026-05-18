
For each slot, walking forwards.

Outer guards (skip slot if any):
    Current type: Occupied                                  -> skip
    Current type: Travel                                    -> skip (already placed)
    Current type: Available, duration <= 0                  -> skip
    startLoc == endLoc (no transition needed)               -> skip
    startLoc == null or endLoc == null ("Anywhere")         -> skip

Direction = legTracker.track(startLoc, endLoc)
    outbound -> place at slot END
    return   -> place at slot START

============================================================
PRE-CHECK: Category Layover Bypass
============================================================
Conditions:
    - current is categorized at location L
    - next is available, transitions toward destination D where D != L
    - travel(originLoc -> D) duration is shorter than travel(originLoc -> L) + L-stay + travel(L -> D)
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

Current size: LARGE ENOUGH for travel
-------------------------------------

    Current uncategorized
        -> PlaceAtStart (return) | PlaceAtEnd (outbound)

    Current categorized
        Next type: Occupied
            -> PlaceAtStart | PlaceAtEnd

        Next type: Available
            Next uncategorized
                -> PlaceAtStart | PlaceAtEnd

            Next categorized, same location as current
                -> PlaceAtStart | PlaceAtEnd

            Next categorized, different location (cat-cat boundary)
                Symmetric fits (current.tail >= travel/2 AND next.head >= travel/2)
                    -> Place travel symmetrically across boundary
                       (eat travel/2 from current's end, travel/2 from next's start)

                Symmetric doesn't fit, but asymmetric does
                (one side has < travel/2 but combined current.tail + next.head >= travel)
                    Anchor on the side with less room, eat remainder from the other
                        -> Fill the smaller side completely
                        -> Eat remainder from the larger side

                Asymmetric doesn't fit either
                (one side has 0 room because boundary is at slot start/end)
                    -> Fall back to PlaceAtEnd (consume only current's tail)


Current size: NOT LARGE ENOUGH for travel
-----------------------------------------

    Prev type: Available

        Next type: Available
            Symmetric 3-slot bleed fits
            (prev.tail >= overflow/2 AND next.head >= overflow/2, where overflow = travel - current)
                -> Symmetric bleed: eat overflow/2 from prev.tail, fill current, eat overflow/2 from next.head

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

        Next type: Travel
            -> Shouldn't happen going forward (we always advance past placed travel)


    Prev type: Occupied

        Next type: Available
            Travel fits in current + next
                -> Fill current, remainder eats from next.head

            Travel too big
                (Future: walk next+1, next+2... until covered or hit occupied)
                -> ALERT over [current, next]

        Next type: Occupied
            -> ALERT over [current] alone (no bleed possible either direction)

        Next type: Travel
            -> Shouldn't happen


    Prev type: Travel
        // Prev is an existing travel from earlier this pass: travel(X -> Y)
        // Current transition is Y -> Z
        // Try to bridge: replace prev with single travel(X -> Z) spanning [prev, current]

        newTravel = travel(X -> Z) duration

        newTravel fits in [prev.start, current.end]
            -> Absorb prev, emit single travel(X -> Z) spanning prev + current

        newTravel too big for [prev + current]
            -> Absorb prev, ALERT over [prev, current]



============================================================
ALERT
============================================================
When a branch terminates in ALERT:

    Window = [earliest slot start, latest slot end] from the bleed attempt
             bounded by occupied slots on either side

    Replace all available slots in the window with one travel block:
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
3. Travel slots carved out of a category slot carry categoryId + isStrictCategory
4. legTracker.track() called exactly once per processed slot (in the entry loop, not inside actions)


============================================================
KNOWN GAP — pre-existing, not addressed by this tree
============================================================
An occupied event at location A directly followed (no gap) by a cat slot at
location B: the splitter sets the cat slot's startLoc to B, so the walker
sees startLoc == endLoc == B for that slot's interior and places no travel.
The A -> B transition is silently dropped.

This was true under the old model too. Two ways to handle it later:
    (a) Splitter sets cat.startLoc = A when prev event has a different loc —
        then the cat slot becomes a tooSmall transition case and the tree
        handles it via "prev=occupied" branches above.
    (b) Walker explicitly checks boundary(slots[i-1].endLoc, slots[i].startLoc)
        as a separate transition independent of the slot's own internal one.

(a) is less disruptive; (b) is more honest about boundaries.


============================================================
FUTURE EXTENSIONS (placeholder markers)
============================================================
- 5-slot, 7-slot bleed windows (expand outward when 3-slot insufficient)
- Multi-step backward walk (prev=occupied + next=occupied + insufficient -> walk further)
- Multi-step forward walk (mirror)
- Cascading prev-travel absorption (3+ chained legs into one)
- Cancel/gray-out category slots fully covered by alert travel
