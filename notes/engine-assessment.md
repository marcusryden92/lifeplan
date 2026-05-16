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

        
