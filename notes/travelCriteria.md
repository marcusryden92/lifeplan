

If we have 3 slots prev, current, next, here are the criteria they can fulfill

If prevLocation != nextLocation

Placement 
    SlotStart
    SlotEnd

    Current:
            Current type: Occupied
                -> Skip to next slot
            Current type Travel (probably won't be the case since we're moving forwards)
            Current type: Available
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
                            Prev type: Travel
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
