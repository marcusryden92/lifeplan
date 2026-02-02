/**
 * CategoryTravelManager
 *
 * Manages travel time injection for category time slots.
 * Handles complex scenarios where events before/after/inside categories
 * need travel time to/from the category location.
 */

import { SimpleEvent } from "@/types/prisma";
import { RuntimeEventExtendedProps } from "@/types/ui";
import { TimeSlotManager } from "../../core/TimeSlotManager";
import { CategoryConstraint } from "../../models/SchedulingModels";

interface CategoryPeriod {
  start: Date;
  end: Date;
  categoryId: string;
  categoryName: string;
  categoryColor?: string | null;
  isStrict: boolean;
}

export class CategoryTravelManager {
  constructor(
    private slotManager: TimeSlotManager,
    private plannerLocationMap: Map<string, string | null>
  ) {}

  /**
   * Pre-create travel TO/FROM categories that have a location.
   *
   * Scenarios for travel TO category:
   * 1. Plan before cat with plenty of space → Travel ends at category start
   * 2. Plan too close → Travel extends into category, pushing items forward
   * 3. Plan overlaps start of cat → Travel entirely inside category (from cat start)
   * 4. Plan entirely inside cat near start → Travel TO plan overlaps cat start
   * 5. Plan far into cat → Category needs its own to-travel, plan handles its own
   */
  injectCategoryTravel(
    categoryPeriods: CategoryPeriod[],
    categoryConstraints: Map<string, CategoryConstraint>,
    eventArray: SimpleEvent[]
  ): void {
    if (categoryPeriods.length === 0) return;

    // Build category location lookup
    const categoryLocationMap = new Map<string, string | null>();
    for (const constraint of categoryConstraints.values()) {
      categoryLocationMap.set(constraint.id, constraint.locationId ?? null);
    }

    // Index events by day for quick lookup
    const eventsByDay = this.indexEventsByDay(eventArray);

    // Process each category period
    for (const period of categoryPeriods) {
      const categoryLoc = categoryLocationMap.get(period.categoryId) ?? null;
      if (!categoryLoc) continue;

      this.processCategoryPeriod(period, categoryLoc, eventsByDay);
    }
  }

  /**
   * Index events by day (YYYY-MM-DD) for efficient lookup
   * Excludes templates, travel, and category wrapper events
   */
  private indexEventsByDay(
    events: SimpleEvent[]
  ): Map<string, SimpleEvent[]> {
    const eventsByDay = new Map<string, SimpleEvent[]>();

    for (const event of events) {
      const type = event.extendedProps?.itemType;
      if (type === "template" || type === "travel" || type === "category") {
        continue;
      }

      const dayKey = event.start.slice(0, 10);
      const dayEvents = eventsByDay.get(dayKey) || [];
      dayEvents.push(event);
      eventsByDay.set(dayKey, dayEvents);
    }

    // Sort each day's events by start time
    for (const [key, dayEvents] of eventsByDay) {
      dayEvents.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
      eventsByDay.set(key, dayEvents);
    }

    return eventsByDay;
  }

  /**
   * Process a single category period and inject travel as needed
   */
  private processCategoryPeriod(
    period: CategoryPeriod,
    categoryLoc: string,
    eventsByDay: Map<string, SimpleEvent[]>
  ): void {
    const periodStartMs = period.start.getTime();
    const periodEndMs = period.end.getTime();
    const dayKey = period.start.toISOString().slice(0, 10);
    const dayEvents = eventsByDay.get(dayKey) || [];

    // Find event before category start
    const eventBeforeCat = this.findEventBeforeCategory(
      dayEvents,
      periodStartMs
    );

    // Inject travel TO category if needed
    this.injectTravelToCategory(
      period,
      categoryLoc,
      eventBeforeCat,
      periodStartMs
    );

    // Find events inside category
    const eventsInCategory = this.findEventsInsideCategory(
      dayEvents,
      periodStartMs,
      periodEndMs
    );

    // Inject travel back FROM last event in category TO category location
    if (eventsInCategory.length > 0) {
      this.injectReturnTravelToCategory(
        eventsInCategory,
        categoryLoc,
        period.categoryId
      );
    }

    // Inject travel FROM category to next location
    this.injectTravelFromCategory(period, categoryLoc, periodEndMs);
  }

  /**
   * Find the last event that starts before category start
   */
  private findEventBeforeCategory(
    dayEvents: SimpleEvent[],
    periodStartMs: number
  ): SimpleEvent | null {
    return (
      [...dayEvents]
        .filter((e) => new Date(e.start).getTime() < periodStartMs)
        .pop() || null
    );
  }

  /**
   * Find all events completely inside the category period
   */
  private findEventsInsideCategory(
    dayEvents: SimpleEvent[],
    periodStartMs: number,
    periodEndMs: number
  ): SimpleEvent[] {
    return dayEvents.filter((e) => {
      const start = new Date(e.start).getTime();
      const end = new Date(e.end).getTime();
      return start >= periodStartMs && start < periodEndMs && end <= periodEndMs;
    });
  }

  /**
   * Inject travel TO category location
   */
  private injectTravelToCategory(
    period: CategoryPeriod,
    categoryLoc: string,
    eventBeforeCat: SimpleEvent | null,
    periodStartMs: number
  ): void {
    let prevLoc: string | null = null;
    let prevEventEnd: Date | null = null;
    let eventOverlapsCategory = false;

    if (eventBeforeCat) {
      const evEnd = new Date(eventBeforeCat.end);
      prevEventEnd = evEnd;

      // Get location of previous event
      const ext = eventBeforeCat.extendedProps as
        | RuntimeEventExtendedProps
        | undefined;
      const plannerId = ext?.eventId ?? eventBeforeCat.id;
      prevLoc = this.plannerLocationMap.get(plannerId) ?? null;

      // Check if event overlaps into category
      if (evEnd.getTime() > periodStartMs) {
        eventOverlapsCategory = true;
      }
    } else {
      // No event before - check slot's prevLocationId
      const daySlots = this.slotManager.getDaySlots(period.start);
      const slotAtStart = daySlots.find(
        (s) =>
          s.isAvailable &&
          s.start.getTime() <= periodStartMs &&
          s.end.getTime() >= periodStartMs
      );
      if (slotAtStart) {
        prevLoc = slotAtStart.prevLocationId ?? null;
        prevEventEnd = slotAtStart.start;
      }
    }

    // Create travel TO category if prev location differs
    if (prevLoc && prevLoc !== categoryLoc) {
      const minutes = this.slotManager.getTravelTime(
        prevLoc,
        categoryLoc,
        period.start
      );

      if (minutes > 0) {
        if (eventOverlapsCategory) {
          // Event overlaps - travel starts at max(periodStart, prevEventEnd)
          const travelStart = new Date(
            Math.max(periodStartMs, prevEventEnd!.getTime())
          );
          this.slotManager.reserveStandaloneTravelAfter(
            travelStart,
            minutes,
            prevLoc,
            categoryLoc,
            `${period.categoryId}-${period.start.toISOString()}`,
            true // force
          );
        } else {
          // Event before category - try to fit travel before category start
          const travelEndBefore = new Date(periodStartMs);
          const canFit = this.slotManager.canPlaceStandaloneTravelBefore(
            travelEndBefore,
            minutes
          );

          if (canFit) {
            this.slotManager.reserveStandaloneTravelBefore(
              travelEndBefore,
              minutes,
              prevLoc,
              categoryLoc,
              `${period.categoryId}-${period.start.toISOString()}`
            );
          } else {
            // Not enough room - extend into category
            const bufferMs = this.slotManager.getBufferTimeMinutes() * 60000;
            const travelStart = prevEventEnd
              ? new Date(prevEventEnd.getTime() + bufferMs)
              : new Date(periodStartMs - minutes * 60000);

            this.slotManager.reserveStandaloneTravelAfter(
              travelStart,
              minutes,
              prevLoc,
              categoryLoc,
              `${period.categoryId}-${period.start.toISOString()}`,
              true // force
            );
          }
        }
      }
    }
  }

  /**
   * Inject return travel FROM last event in category back TO category location
   */
  private injectReturnTravelToCategory(
    eventsInCategory: SimpleEvent[],
    categoryLoc: string,
    _categoryId: string
  ): void {
    const lastEvent = eventsInCategory[eventsInCategory.length - 1];
    const lastEventEnd = new Date(lastEvent.end);
    const lastEventExt = lastEvent.extendedProps as
      | RuntimeEventExtendedProps
      | undefined;
    const lastEventPlannerId = lastEventExt?.eventId ?? lastEvent.id;
    const lastEventLoc = this.plannerLocationMap.get(lastEventPlannerId) ?? null;

    if (lastEventLoc && lastEventLoc !== categoryLoc) {
      const minutesBack = this.slotManager.getTravelTime(
        lastEventLoc,
        categoryLoc,
        lastEventEnd
      );

      if (minutesBack > 0) {
        const bufferMs = this.slotManager.getBufferTimeMinutes() * 60000;
        const travelBackStart = new Date(lastEventEnd.getTime() + bufferMs);

        this.slotManager.reserveStandaloneTravelAfter(
          travelBackStart,
          minutesBack,
          lastEventLoc,
          categoryLoc,
          `${lastEvent.id}-return-to-category`,
          true // force
        );
      }
    }
  }

  /**
   * Inject travel FROM category to next location
   */
  private injectTravelFromCategory(
    period: CategoryPeriod,
    categoryLoc: string,
    periodEndMs: number
  ): void {
    const daySlots = this.slotManager.getDaySlots(period.end);
    const slotAfter = daySlots.find(
      (s) =>
        s.isAvailable &&
        s.start.getTime() <= periodEndMs &&
        s.end.getTime() >= periodEndMs
    );

    if (slotAfter) {
      const nextLoc = slotAfter.nextLocationId ?? null;
      if (nextLoc && nextLoc !== categoryLoc) {
        const minutes = this.slotManager.getTravelTime(
          categoryLoc,
          nextLoc,
          period.end
        );

        if (minutes > 0) {
          const travelStart = new Date(periodEndMs);
          this.slotManager.reserveStandaloneTravelAfter(
            travelStart,
            minutes,
            categoryLoc,
            nextLoc,
            `${period.categoryId}-${period.end.toISOString()}`
          );
        }
      }
    }
  }
}
