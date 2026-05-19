```text
For each slot in slots[], in order.

Global notes:
- "Category" is bleed-able like "Available" for travel placement. Wherever
  a "Prev type" or "Next type" branch below says "Available", a Category
  neighbor follows the same math. When a bleed FULLY consumes a category's
  interior, do NOT emit a visible (red) travel slot; instead set
  trespassingStart and/or trespassingEnd directly on the CategorySlot so
  the wrapper renders a red boundary downstream. This applies to adjacent
  categories chained together (two or three in a row fully consumed ->
  set trespass flags on each affected slot, no inner travel slots).
- Null locations ("Anywhere") are treated as "no transition needed".
  The outer guards (prev != next, prev != current, current != next)
  evaluate to FALSE when either side is null.
- Travel-slot marker terminology:
    'alert' (red, insufficientTravel=true): the travel slot is shorter
      than the travel actually needs — couldn't fit fully.
    'overconstrained' (yellow): the travel slot fits the travel duration,
      but the planner was forced into this routing (e.g. absorb-and-replan
      that skips a category visit, or a wasted round trip). The user sees
      yellow to flag "this was the only viable solution".
    Both flags can coexist on the same travel slot.
  Category trespass boundaries (red wrapper border) are independent of
  both markers — they're set on the CategorySlot, not the travel slot.


Current type: Occupied
    -> Skip to next slot

Current type: Travel (probably won't happen on a forward pass; second pass only)
    -> Skip to next slot


Current type: Available
    Outer guard: prev != next (otherwise the slot is transparent; skip)

    Placement
        SlotStart
        SlotEnd

    Current size: large enough for travel
        -> PlaceAtStart
        -> PlaceAtEnd

    Current size: not large enough for travel
        Prev type: Available
            Next type: Available
                Travel can bleed symmertrically into prev and next 
                (i.e both prev and next are larger than (travel - current)/2)
                    -> Place travel symmetrically across prev, current and next

                Travel can not bleed symmetrically into prev and next
                    Prev, current and next are large enough for travel
                        -> Place travel asymmetrically over prev, current and next (fill up current, and the smallest out of prev and next, and as much as is needed of the remainder)

                    Prev, current and next are not large enough for travel
                        -> Fill all of them with travel, mark travel as 'alert' (not large enough)
                        (Future: continue traversing the array forwards and backwards until enough space is found, or we hit an occupied slot, in which case place an 'alert' travel)

            Next type: Occupied
                Prev and current large enough for travel
                    -> Fill current, remainder to prev

                Prev and current not large enough for travel
                    -> Fill both, schedule 'alert' travel
                    (Future: transverse backwards until travel filled or hit hard stop)

            Next type: Travel
                I don't see how this could happen since we're moving forwards,
                unless we're doing a second pass for some reason

        Prev type: Occupied
            Next type: Available
                Next and current large enough for travel
                    -> Fill current, remainder to next

                Next and current not large enough for travel
                    -> Fill both, schedule 'alert' travel
                    (Future: transverse forwards until travel filled or hit hard stop)

            Next type: Occupied
                -> Fill current, schedule travel as 'alert'

            Next type: Travel
                Not reachable on a forward walk (slots[i+1] should not be a
                Travel slot — the walker hasn't placed it yet)
                    -> Log inconsistency

            Next type: Category
                # Same shape as Next type: Available per global note,
                # with trespass marking if the category interior is fully
                # consumed by the bleed.
                Next and current large enough for travel
                    -> Fill current, remainder to next (eating from category HEAD)
                    (set trespassingStart on next CategorySlot if its interior
                    is fully consumed)

                Next and current not large enough for travel
                    -> Fill both, schedule 'alert' travel
                    (set trespassingStart on next CategorySlot if fully consumed)

        Prev type: Travel
            # slots[i-1] is Travel directly, OR slots[i-2] is Travel across a
            # transparent prev Available (placeAtSlotStart=true variant —
            # walker placed travel at the leading Available's START so the
            # transparent leftover sits at slots[i-1] and the Travel at i-2).
            # Both shapes are recognized; the discovery looks past a
            # transparent neighbor to find the absorbable Travel.
            Prev and current are large enough for travel
                -> Absorb prev travel from A-B, and create a new travel instance from A-C

            Prev and current are not large enough for travel
                Next type: Available
                    Travel can bleed symmertrically into prev and next 
                    (i.e both prev and next are larger than (travel - current)/2)
                        -> Absorb prev travel, plan new travel symmetrically across prev, current and next

                    Travel can not bleed symmetrically into prev and next
                        Prev, current and next are large enough for travel
                            -> Absorb prev travel, plan new travel asymmetrically over prev, current and next (fill up current, and the smallest out of prev and next, and as much as is needed of the remainder)

                        Prev, current and next are not large enough for travel
                            -> Absorb prev travel, fill all of them with new travel, mark travel as 'alert' (not large enough)

                            (Future: continue traversing the array forwards and backwards until enough space is found, or we hit an occupied slot, in which case place an 'alert' travel)

                Next type: Occupied
                    # Backward-absorb routing: undo prev Travel, replan from
                    # prev_travel.fromLocation to next.location, fitting the
                    # new travel in (restored Available + current) at the
                    # end of current.
                    -> Absorb prev Travel back into its adjacent Available
                       (merge them, undoing the earlier walker placement)
                    -> Compute the new travel A->C, where A = prev Travel's
                       fromLocation and C = next.location
                    -> Place the new travel ending at next.start, filling
                       current; remainder bleeds backward into the restored
                       Available
                    If A->C duration exceeds (current + restored Available)
                        -> Fill what's available, mark travel as 'alert'
                        (Future: traverse further backwards beyond prev+2)

                Next type: Category
                    # Same shape as Next type: Available per global note,
                    # with trespass marking if next category's interior is
                    # fully consumed by the bleed.

                Next type: Travel
                    Not reachable on a forward walk (slots[i+1] should not be
                    a Travel slot — the walker hasn't placed it yet)
                        -> Log inconsistency


Current type: Category
    # Two independent transitions to consider:
    #   - entry edge at slot HEAD when prev != current
    #   - exit edge at slot TAIL when current != next
    # In most layouts an adjacent Available slot already carried the
    # transition via the "Current type: Available" tree above; the category
    # itself only does work when no adjacent Available exists to absorb it.

    Entry edge (prev != current)
        no prev (i = 0, no slots[i-1])
            -> Skip (assume the user is at current location)

        Prev type: Travel
            Travel destination == current
                -> Skip (already placed: by the walker on the leading Available,
                   or by an earlier category's exit edge in a category-to-category
                   boundary)
            Travel destination != current
                -> Log inconsistency

        Prev type: Available
            # The walker already processed slots[i-1]. Depending on
            # placeAtSlotStart, slots[i-1] is now either Travel ending at
            # current (travel placed at the leading Available's end), or
            # the remaining Available with slots[i-2] = Travel ending at
            # current (travel placed at the leading Available's start).
            slots[i-1] is Travel ending at current
                -> Skip
            slots[i-1] is Available and slots[i-2] is Travel ending at current
                -> Skip
            otherwise
                -> Log inconsistency

        Prev type: Category
            -> Skip (category-to-category: previous category's exit edge
               handled this transition already)

        Prev type: Occupied (different location than current)
            Travel prev->current fits in category HEAD
                -> PlaceAtStart (eats from category interior)

            Travel prev->current does not fit in category HEAD
                # Bypass: route a single travel directly from prev to slots[i+1],
                # consuming the category interior. Cascade mirrors the
                # "Current type: Available, not-large-enough, Prev type: Occupied,
                # Next type: Available" subtree above, with substitutions:
                #     current = this category interior
                #     next    = slots[i+1]
                # When the bypass fires, the exit edge below is a no-op because
                # this slot is now Travel, not Category.
                # Set trespassingStart on this CategorySlot for the boundary
                # the bypass consumes.

    Exit edge (current != next)
        no next (i = last, no slots[i+1])
            -> Mark slot as 'final' so the generator knows to re-expand templates
               and resume here. Skip exit travel for now.

        Next type: Available
            -> Defer (walker will handle slots[i+1] under
               "Current type: Available" — the trailing Available has
               prev=current, next=elsewhere, and its standard tree fires)

        Next type: Category
            # Category-to-category boundary with no Available gap between.
            # This (earlier) category owns the transition; the later category's
            # entry edge will see Prev type: Travel ending at current and skip.
            Travel can bleed symmetrically across boundary (each side > travel/2)
                -> Place symmetrically across boundary

            Travel can not bleed symmetrically across boundary
                Combined current + next large enough for travel
                    -> Fill available space of next, remainder to current

                Combined current + next not large enough for travel
                    # Same shape as the user's window-expansion cascade
                    # (the original "Current is Available, Next is uncategorized,
                    # travel can not fit entirely into next" reasoning). Extend
                    # forward through Next+1, Next+2, etc. until the travel fits
                    # or we hit a hard stop:
                    Next+1 type: Occupied
                        -> Place a travel from current to Next+1, fill entire next
                           and place remainder in current
                    Next+1 type: Available (and large enough alone or in combination)
                        -> Place travel current -> Next+1, fill next, bleed
                           remainder symmetrically/asymmetrically per the
                           Available-cascade above
                    Next+1 type: Category (same shape, deeper chain)
                        -> Extend further until fit or hard stop

                    Hard stop case: travel fully consumes two or more adjacent
                    category interiors
                        -> Do NOT emit visible travel slots between them; set
                           trespassingStart / trespassingEnd flags on each
                           consumed CategorySlot as appropriate. The user sees
                           red boundaries instead of red interior blocks,
                           making the constraint readable.

        Next type: Occupied
            Travel current->next fits in category TAIL
                -> PlaceAtEnd (eats from category interior)

            Travel current->next does not fit in category TAIL
                Prev type: Travel
                # slots[i-1] directly, OR slots[i-2] across a transparent prev
                # Available (placeAtSlotStart=true variant). In both shapes
                # there's a recently placed travel we can undo.
                    # Backward absorb-and-replan. Original walker plan was
                    # "Travel A->B, then user at B during category, then
                    # Travel B->C". We rewrite to "user stays at A through
                    # the absorbed region, then a single Travel A->C fills
                    # current and bleeds backward". The category at B is
                    # never reached.
                    -> Absorb the prev Travel back into its adjacent Available
                       (merge them into a single Available slot, undoing the
                       earlier walker placement)
                    -> Compute the new travel A->C, where A = prev Travel's
                       fromLocation and C = next.location
                    -> Place the new travel at the TAIL of current, ending at
                       next.start. Fill current's interior entirely; remainder
                       bleeds backward into the restored Available
                    -> Mark the new travel as 'overconstrained' (yellow) —
                       the planner was forced into this routing because the
                       category at current cannot be reached
                    -> Set trespassingStart AND trespassingEnd on this
                       CategorySlot (red wrapper borders — the category was
                       never reached because travel goes straight through it)
                    (If A->C duration exceeds current + restored Available
                    combined, also mark the travel as 'alert'; trespass flags
                    and overconstrained still apply)

                Prev type: Available (no backward Travel to absorb)
                    -> Fill category TAIL with travel, mark travel as 'alert'
                       OR if the entire category interior is consumed: set
                       trespassingEnd on this CategorySlot instead of
                       emitting a visible travel slot

                Prev type: Occupied (no backward expansion possible)
                    -> Fill category TAIL with travel, mark travel as 'alert'
                       OR if the entire category interior is consumed: set
                       trespassingEnd on this CategorySlot

                Prev type: Category
                    # No special cat-to-cat backward absorb. The earlier
                    # category's exit edge already placed its own travel
                    # (so in practice slots[i-1] becomes that Travel and
                    # we route through the Prev type: Travel branch above).
                    # If we somehow land here with prev still a Category,
                    # the simple fallback applies:
                    -> Fill category TAIL with travel, mark 'alert' OR if
                       entire category interior is consumed: set
                       trespassingEnd on this CategorySlot

                (Future: traverse forwards beyond the occupied)

        Next type: Travel
            Not reachable on a forward walk (slots[i+1] should not be a
            Travel slot — the walker hasn't placed it yet)
                -> Log inconsistency
```
