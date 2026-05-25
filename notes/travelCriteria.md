```text
If we have 3 slots prev, current, next, here are the criteria they can fulfill

If prevLocation != nextLocation

Placement 
    SlotStart
    SlotEnd

Current type: Occupied
    -> Skip to next slot

Current type Travel (probably won't be the case since we're moving forwards)

Current type: Available
    Current size: large enough for travel
        Current is uncategorized
            -> PlaceAtStart
            -> PlaceAtEnd

        Current is categorized
            Next type: Occupied
                -> PlaceAtStart
                -> PlaceAtEnd

            Next type: Available
                Next is categorized
                    Travel can bleed symmetrically across boundary (next > travel/2)
                        -> Place symmetrically across boundary 

                    Travel can not bleed symmetrically across boundary
                        -> Fill available space of next, remainder to current

                Next is uncategorized
                    Travel can fit entirely into next
                        -> Split next into A and B, where A is travel. Continue from B

                    Travel can not fit entirely into next
                        Next+1 type: Occupied
                            -> Place a travel from current to next+1, fill entire next and place remainder in current

                        Next+1 type: Available
                            Next+1 is uncategorized (not possible)

                            Next+1 is categorized
                                Next+1 is larger than (next - travel)/2
                                    -> Place travel between current and next+1 symmetrically across next, so that equal parts bleed into current and next+2

                                Next+1 is smaller than (next - travel)/2
                                    Next+2 same location as next+1
                                        -> Fill next+1 and next with a travel from current to next+1, bleed remainder into current

                                    Next+2 different location from next+1 
                                        Travel from current to next+2 < next+1
                                            -> Place travel in next+1 at slot end

                                        Travel from current to next+2 > next+1
                                            Travel current-next+2 < next + next+1
                                                -> Fill next+1, remainder in next

                                            Travel current-next+2 > next + next+1 && Travel current-next+2 < current + next + next+1
                                                -> Fill next and next+1, remainder in current

                                            Travel current-next+2 < current + next + next+1
                                                Prev type: Occupied
                                                    Prev location is different from next+2
                                                        Prev-next+2 travel is equal to current + next + next+1
                                                         -> Plan travel from prev to next+2 that covers the entire space
                                                        
                                                        Prev-next+2 travel is larger than current + next + next+1
                                                            -> Plan travel from prev to next+2 with 'alert'

                                                        Prev-next+2 travel is smaller than current + next + next+1
                                                            -> Plan a travel that stretches the entire space, from prev-next+2

                                                    Prev location is same as next+2
                                                        -> Plan a travel that stretches the entire space, marked as 'overconstrained' - which is yellow instead of red like 'alert'

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
```
