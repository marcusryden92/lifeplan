## CalendarGenerator

buildInitialEventArray()

    # move buildInitialEventArray into EventAssembler
    # should EventAssembler even be its own class? 
    # it has no state

    -> EventAssembler
        -> buildMemoizedEvents()
            - takes previous calendar, returns Set of
              ids of events before now()
            - adds those events to event array
        
        -> buildPlanEvents()
            - adds plan events to event array
            - filter out memoized events
        
        -> buildCompletedEvents()
            - same as above for completed events

    @ returns:
    @ - eventArray (previous + plans + completed) 
    @ - memoized event ids array

expandTemplates()
    
    -> TemplateExpander
        -> expandTemplates()
            - turn EventTemplates into recurring calendar event
              objects
        
        -> getPerTemplateMask()
            - creates array of PerTemplateMasks:

                ```typescript
                type PerTemplateMask = {
                    templateId: string;
                    title?: string;
                    color?: string;
                    locationId?: string | null;
                    dayOfWeek: number;
                    startMinutes: number;
                    endMinutes: number;
                    startDateISO?: string;
                    intervalDays?: number;
                };
                ```
            - used to calculate occupied slots for recurring template events

        -> calculateLargestGap()
            - get the largest possible gap in a week of template events
            - used to disqualify items that are too big to fit anywhere
    
    - filter stale template events from the event array and add 
      the new ones in.

    @ returns:
    @ - filtered events
    @ - recurring template events (for logging)
    @ - perTemplateMasks
    @ - largestTemplateGap
    @ - metrics 
            
buildLocationMap()

    -> LocationMapper 
        - creates a categoryLocationMap: Map<string, string | null> 
        - creates a plannerMap: Map<string, Planner> 

        - constructor adds category id + location/null for every category
          to categoryLocationMap

        -> buildLocationMap()
            - creates a Map<string, string | null>
            - loops through all planners
            - resolves planner location (local, parent- or category location)
            - adds planner id
            - adds location id

    @ returns:
    @ - locationMap: Map<string, string | null>

buildAvailableSlots()
    # Why are we already adding template events 
      earlier in CalendarGenerator if they're filtered out here anyway?

    -> daysNeededForPlans()
        - gets how many days (rounded up to whole weeks) 
          until furthest away plan

    - filter existing eventArray for relevant events
      (correct time frame, no template events)

    -> eventsToIntervals()
        - create intervals from events

        ```typescript
        interface OccupiedInterval {
            start: Date;
            end: Date;
            startLocationId: string | null;
            endLocationId: string | null;
            }
        ```
    -> masksToIntervals()
        - expand PerTempateMasks to OccupiedIntervals for a given time range

    - push eventIntervals and templateIntervals to occupiedIntervals[]

    -> inheritLocationFromCategoryPeriods()
        # Should this be checked day by day? Midnight issues?

        - Assign location to locationless OccupiedInterval that fall within
          category period that has a location. Checked day-by-day to avoid global period expansion.

    - get the event just before range start, if there is one
    - get its location.

    -> findGaps()
        
        -> mergeIntervals()
            - merge any overlapping OccupiedIntervals

        - check if there is a free slot between now() and 
          the first OccupiedInterval - if so make it a free slot
        - loop through OccupiedIntervals and calculate the empty slots
          between them
        - check if there is a free slot between the end of the last 
          OccupiedInterval and the end of the time range

    -> splitSlotsAtCategoryBoundaries()

        -> getAllBoundaries()
            - takes in categories
            - creates two Maps:
                enteringAt: Map<number, ConstraintInfo>
                leavingAt:  Map<number, ConstraintInfo>

            - get the current day at 00:00

            - while loop that starts at current day and continues until
              day is greater than range end

              {

                - loops every Category
                    - create a category info object for that category (ConstraintInfo)

                    ```typescript
                    
                        type ConstraintInfo = {
                            categoryId: string;
                            locationId: string | null;
                            isStrict: boolean;
                        };
                    ```
                    - loops each time window of that Category
                    
                    -> expandSlotForDays()
                        - convert the time window from format hh:mm
                          to a period: { start: Date; end: Date } for the current day

                    - get unix ms for start
                    - get unix ms for end

                    - set enteringAt    <startMs, ConstraintInfo>
                    - set leavingAt     <endMs, ConstraintInfo> 

                    - increment day loop
              }

              - merge enteringAt and leavingAt to one array with 

                ```typescript
                type CategoryBoundary = {
                    boundaryMs: number;
                    leaving: ConstraintInfo | null;
                    entering: ConstraintInfo | null;
                };
                ```

            @ returns:
            @ - CategoryBoundary[]

        -> boundaries.reduce(applySplitsForBoundary, slots)

            seed = slots, accumulator threads new array through each boundary

            -> applySplitsForBoundary(slots, boundary)

                slots.flatMap:
                    - if boundary falls outside slot: keep slot as-is
                    - else:

                    -> splitSlot(slot, boundary)
                        - compute beforeDuration / afterDuration from boundaryMs
                        - build before-fragment (null if zero-length):
                            categoryId  = leaving (we're inside the leaving cat)
                            nextLocId   = entering ?? leaving ?? slot.next
                        - build after-fragment (null if zero-length):
                            categoryId  = entering (we're inside the entering cat)
                            prevLocId   = entering ?? leaving ?? slot.prev
                        - entering wins over leaving (where we ARE, not where we WERE)

                    - drop nulls, return [before, after]

            @ returns
            @ - AvailableSlot[] with the boundary split applied
              (becomes seed for the next boundary)

        @ after all boundaries folded in
        @ - AvailableSlot[] split at every category boundary in range

staticEventTravelPass()
    
    for every AvailableSlot[]:

        -> processSlot()

            -> TravelManager

                -> createLegTracker()
                    - openLegs: {from, to}[]

                    - track(from, to)
                        - mirror found → splice, return true
                        - chain start found → splice tail, return true
                        - else → push, return false

                    - reset()

                    @ returns { track, reset }

            
                -> resolveTravel()
                    - check if slot has a prev and next location and that they
                      aren't the same
                    - pass prev and next location into legTracker to check if
                      travel should be placed at start or end of slot
                    - get travel time from travel matrix

                    @ return 

                    ```typescript
                    type TravelProcessingAction = {
                        prevLocation: string;
                        nextLocation: string;
                        placeAtSlotStart: boolean;
                        travelMinutes: number;
                    };
                    ```
                
        if placeAtSlotStart == false -> handleOutbound()
        if placeAtSlotStart == true -> handleReturn()

            -> handleOutbound()

                - get slot
                - get nextSlot
                - get bufferTime

                - get travelMs
                - get slotMs

                -> tryBypassOutboundCategoryLayover()

                    pattern: [non-cat] → [contiguous cat, mid-period, onward to 3rd loc]
                             collapses prev → [cat] → next   into   prev → next

                    - eligibility:
                        - slot is not a category
                        - nextSlot is a category, contiguous
                        - nextSlot.nextLocationId exists and != categoryLocation
                        - cat period extends past nextSlot.end
                          (else normal placement handles outgoing
                           at the period boundary)

                    - decide — two independent triggers, either fires:
                        - categorySlotCannotHoldOutgoing
                            cat→destination travel > nextSlot duration
                        - combinedSpanCannotHoldBoth
                            toCat + buffer + catToDest > slot + nextSlot

                    - emit anchor depends on which trigger fired:

                        - category too small  → anchor at span END
                            -> emitDirectTravelAnchoredAtSpanEnd()
                                preserves leftover before travel
                                consumes 2 slots
                        
                        - combined too tight  → anchor at span START
                            -> emitDirectTravelAnchoredAtSpanStartTrimmingNext()
                                trims next (cat) slot in place
                                consumes 2 if travel reaches spanEnd, else 1

                    @ returns { handled: boolean; slotsConsumed: number }

                if bypass.handled → return slotsConsumed

                - canCenterOnBoundary?
                    - both this and next slot are categories
                    - contiguous
                    - travel/2 fits in each side

                    -> placeTravelCenteredOnBoundary()
                        - half before boundary, half after
                        - leftover fragment before travel pushed if any
                        - mutates next slot's start to travelEnd
                    return 1

                if travelMs < slotMs:
                    -> placeTravelAtSlotEnd()
                        - travel at slot.end - travelMs … slot.end
                        - leftover at slot.start … travelStart (if any)

                if travelMs == slotMs:
                    -> tryShiftTravelBackward(allowAcrossUnrelatedSlots=true)
                        free win — borrow buffer from previous result slot

                        - previous slot must be available
                        - allowAcrossUnrelated=true → ok to shift into a category
                        - newTravelEnd   = slot.end - buffer
                          newTravelStart = newTravelEnd - travelMs
                        - need adjacency + room in previous slot
                        - emit travel, shrink (or pop) previous slot

                        if shifted → done

                    - if slot is a category → trespass, don't consume:
                        push CategoryBoundaryTrespass { boundary: "end" }
                        push slot to result as-is
                        (wrapper's bottom border renders red)

                    - else fill slot exactly:
                        -> placeTravelAtSlotEnd()

                if travelMs > slotMs:
                    -> tryShiftTravelBackward(allowAcrossUnrelatedSlots=false)
                        last-resort variant — stricter:
                        - refuses if previous slot is a category
                          (don't consume cat time to fit oversized travel)
                        - refuses if BOTH slot and previous are non-cat
                          (don't stretch travel across unrelated regions)

                        if shifted → done

                    -> tryExtendForwardIntoCategory()
                        - eligible: current non-cat, next is contiguous cat
                        - emit travel from slot.start running past slot.end
                        - trim nextSlot.start = travelEnd + buffer

                        if extended → done

                    - if slot is a category → trespass:
                        push CategoryBoundaryTrespass { boundary: "end" }
                        push slot to result as-is

                    - else nothing fit:
                        -> pushInsufficientTravel()
                            marks slot insufficient (renders red on calendar)

            -> handleReturn()

                - get slot
                - get nextSlot

                -> tryBypassReturnCategoryLayover()

                    pattern: [cat, returning from foreign] → [non-cat leaving cat-loc for 3rd loc]
                             collapses foreign → [cat] → final   into   foreign → final

                    - eligibility (tightness is implicit in the duration check):
                        - slot is a category
                        - returnTravelMinutes >= slot duration
                        - nextSlot exists, non-category, contiguous
                        - nextSlot.prevLocationId == categoryLocation
                        - nextSlot.nextLocationId exists

                    -> emitDirectTravelAnchoredAtSpanStartWithLeftover()
                        - foreign → final anchored at slot.start
                        - leftover at end → available time at destination

                    @ returns { handled: true, slotsConsumed: 2 }

                if bypass.handled → return slotsConsumed

                - get travelMs, slotMs
                - if slot is a category and travelMs >= slotMs → trespass:
                    push CategoryBoundaryTrespass { boundary: "start" }
                    push slot to result as-is

                -> placeTravelAtSlotStart()
                    - travel at slot.start … slot.start + travelMs
                    - if doesn't fit → pushInsufficientTravel
                    - leftover at travelEnd … slot.end (if any)

