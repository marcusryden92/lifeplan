"use client";

import {
  Planner,
  SimpleEvent,
  EventTemplate,
  EventExtendedProps,
  EventType,
  Category,
  CategoryTimeWindow,
} from "@/types/prisma";
import type {
  SerializedLocation,
  SerializedTravelTime,
} from "@/redux/slices/schedulingSettingsSlice";
import { objectsAreEqual } from "../generalUtils";
import { syncCalendarData } from "@/actions/calendar-actions/syncCalendarData";

type ChangeGroup<T> = {
  create: T[];
  update: T[];
  destroy: T[];
};

type PlannerChange = Planner;
type CalendarChange = Omit<SimpleEvent, "extendedProps">;
type TemplateChange = EventTemplate;
type ExtendedPropsChange = EventExtendedProps;
// timeSlots is a related table — flattened across categories and diffed as
// its own group below so a window edit doesn't look like a category update.
type CategoryChange = Omit<Category, "timeSlots">;
type CategoryTimeWindowChange = CategoryTimeWindow;
// Only the editable own-row fields. address/lat/lng/placeId are server-
// authoritative (Google Places) and never flow back from the client.
type LocationChange = SerializedLocation;
// Custom override fields are client-editable. Google base values + identity
// fields stay server-authoritative; create flows through direct actions
// (refreshAllTravelTimes / fetchMissingTravelTimes) because they need a
// Google distance lookup, and destroy is handled by location cascade.
type TravelTimeChange = SerializedTravelTime;

export type DatabaseChanges = {
  planner: ChangeGroup<PlannerChange>;
  calendar: ChangeGroup<CalendarChange>;
  template: ChangeGroup<TemplateChange>;
  extendedProps: ChangeGroup<ExtendedPropsChange>;
  category: ChangeGroup<CategoryChange>;
  categoryTimeWindow: ChangeGroup<CategoryTimeWindowChange>;
  location: ChangeGroup<LocationChange>;
  travelTime: ChangeGroup<TravelTimeChange>;
};

export async function handleServerTransaction(
  userId: string,
  clientKnownDataVersion: number,
  planner: Planner[],
  previousPlanner: { current: Planner[] },
  calendar: SimpleEvent[],
  previousCalendar: { current: SimpleEvent[] },
  template?: EventTemplate[],
  previousTemplate?: { current: EventTemplate[] },
  categories?: Category[],
  previousCategories?: { current: Category[] },
  locations?: SerializedLocation[],
  previousLocations?: { current: SerializedLocation[] },
  travelTimes?: SerializedTravelTime[],
  previousTravelTimes?: { current: SerializedTravelTime[] },
) {
  // Filter out generated events (travel, template, category wrappers) BEFORE serialization
  // These are dynamically generated and should never be persisted to database
  const filterGeneratedEvents = (events: SimpleEvent[]) =>
    events.filter(
      (e) =>
        e.extendedProps?.eventType !== EventType.travel &&
        e.extendedProps?.eventType !== EventType.template &&
        !(
          e.extendedProps &&
          "wrapperId" in e.extendedProps &&
          e.extendedProps.wrapperId
        ), // Category wrapper events have wrapperId
    );

  const filteredCalendar = filterGeneratedEvents(calendar);
  const filteredPreviousCalendar = filterGeneratedEvents(
    previousCalendar.current,
  );

  // Serialize inputs to remove any Date objects or non-serializable data
  const serializedPlanner = JSON.parse(JSON.stringify(planner)) as Planner[];
  const serializedPreviousPlanner = {
    current: JSON.parse(JSON.stringify(previousPlanner.current)) as Planner[],
  };
  const serializedCalendar = JSON.parse(
    JSON.stringify(filteredCalendar),
  ) as SimpleEvent[];
  const serializedPreviousCalendar = {
    current: JSON.parse(
      JSON.stringify(filteredPreviousCalendar),
    ) as SimpleEvent[],
  };
  const serializedTemplate = template
    ? (JSON.parse(JSON.stringify(template)) as EventTemplate[])
    : undefined;
  const serializedPreviousTemplate = previousTemplate
    ? {
        current: JSON.parse(
          JSON.stringify(previousTemplate.current),
        ) as EventTemplate[],
      }
    : undefined;

  const serializedCategories = categories
    ? (JSON.parse(JSON.stringify(categories)) as Category[])
    : undefined;
  const serializedPreviousCategories = previousCategories
    ? {
        current: JSON.parse(
          JSON.stringify(previousCategories.current),
        ) as Category[],
      }
    : undefined;
  const serializedLocations = locations
    ? (JSON.parse(JSON.stringify(locations)) as SerializedLocation[])
    : undefined;
  const serializedPreviousLocations = previousLocations
    ? {
        current: JSON.parse(
          JSON.stringify(previousLocations.current),
        ) as SerializedLocation[],
      }
    : undefined;
  const serializedTravelTimes = travelTimes
    ? (JSON.parse(JSON.stringify(travelTimes)) as SerializedTravelTime[])
    : undefined;
  const serializedPreviousTravelTimes = previousTravelTimes
    ? {
        current: JSON.parse(
          JSON.stringify(previousTravelTimes.current),
        ) as SerializedTravelTime[],
      }
    : undefined;

  const databaseChanges = compareData(
    serializedPlanner,
    serializedPreviousPlanner,
    serializedCalendar,
    serializedPreviousCalendar,
    serializedTemplate,
    serializedPreviousTemplate,
    serializedCategories,
    serializedPreviousCategories,
    serializedLocations,
    serializedPreviousLocations,
    serializedTravelTimes,
    serializedPreviousTravelTimes,
  );

  const response = await syncCalendarData(
    userId,
    databaseChanges,
    clientKnownDataVersion,
  );

  return response;
}

export function compareData(
  planner: Planner[],
  previousPlanner: { current: Planner[] },
  calendar: SimpleEvent[],
  previousCalendar: { current: SimpleEvent[] },
  template?: EventTemplate[],
  previousTemplate?: { current: EventTemplate[] },
  categories?: Category[],
  previousCategories?: { current: Category[] },
  locations?: SerializedLocation[],
  previousLocations?: { current: SerializedLocation[] },
  travelTimes?: SerializedTravelTime[],
  previousTravelTimes?: { current: SerializedTravelTime[] },
) {
  const databaseChanges: DatabaseChanges = {
    planner: { create: [], update: [], destroy: [] },
    calendar: { create: [], update: [], destroy: [] },
    template: { create: [], update: [], destroy: [] },
    extendedProps: { create: [], update: [], destroy: [] },
    category: { create: [], update: [], destroy: [] },
    categoryTimeWindow: { create: [], update: [], destroy: [] },
    location: { create: [], update: [], destroy: [] },
    travelTime: { create: [], update: [], destroy: [] },
  };

  // Check planner changes
  const prevPlan: Planner[] = [...previousPlanner.current];
  const plannerMap = new Map(planner.map((planner) => [planner.id, planner]));
  const prevPlanMap = new Map(prevPlan.map((planner) => [planner.id, planner]));

  // Find items to create or update
  plannerMap.forEach((item) => {
    const prevItem = prevPlanMap.get(item.id);
    if (!prevItem) {
      databaseChanges.planner.create.push(item);
    } else if (!objectsAreEqual(prevItem, item)) {
      databaseChanges.planner.update.push(item);
    }
  });

  // Find items to delete (items in previous but not in current)
  prevPlanMap.forEach((item) => {
    if (!plannerMap.has(item.id)) {
      databaseChanges.planner.destroy.push(item);
    }
  });

  // Check calendar changes
  // Note: Generated events (travel, template, category wrappers) are already filtered out
  // in handleServerTransaction before this function is called
  const prevCal: SimpleEvent[] = [...previousCalendar.current];
  const filteredCalendar = [...calendar];
  const calendarMap = new Map(
    filteredCalendar.map((event) => [event.id, event]),
  );
  const prevCalMap = new Map(prevCal.map((event) => [event.id, event]));

  // Find events to create or update
  calendarMap.forEach((event) => {
    const prevEvent = prevCalMap.get(event.id);

    if (!prevEvent) {
      const { extendedProps, ...eventCore } = event;
      databaseChanges.calendar.create.push(eventCore as CalendarChange);

      if (extendedProps) {
        databaseChanges.extendedProps.create.push({
          ...extendedProps,
          eventId: event.id,
        } as EventExtendedProps);
      }

      return;
    }

    if (!objectsAreEqual(prevEvent, event)) {
      const { extendedProps: _extendedProps, ...eventCore } = event;
      databaseChanges.calendar.update.push(eventCore as CalendarChange);
    }

    if (
      prevEvent.extendedProps &&
      event.extendedProps &&
      !objectsAreEqual(prevEvent.extendedProps, event.extendedProps)
    ) {
      databaseChanges.extendedProps.update.push({
        ...event.extendedProps,
        eventId: event.id,
      } as EventExtendedProps);
    }
  });

  // Find events to delete (events in previous but not in current)
  prevCalMap.forEach((event) => {
    if (!calendarMap.has(event.id)) {
      const { extendedProps: _extendedProps, ...eventCore } = event;
      databaseChanges.calendar.destroy.push(eventCore as CalendarChange);
    }
  });

  // Check template changes

  if (template && previousTemplate) {
    const prevTemp: EventTemplate[] = [...previousTemplate.current];
    const templateMap = new Map(
      template.map((template) => [template.id, template]),
    );
    const prevTempMap = new Map(
      prevTemp.map((template) => [template.id, template]),
    );

    // Find templates to create or update
    templateMap.forEach((template) => {
      const prevTemplate = prevTempMap.get(template.id);
      if (!prevTemplate) {
        databaseChanges.template.create.push(template);
      } else if (!objectsAreEqual(prevTemplate, template)) {
        databaseChanges.template.update.push(template);
      }
    });

    // Find templates to delete (templates in previous but not in current)
    prevTempMap.forEach((template) => {
      if (!templateMap.has(template.id)) {
        databaseChanges.template.destroy.push(template);
      }
    });
  }

  // Categories. timeSlots are a related table — strip before diffing so a
  // change to a window doesn't look like a category update.
  if (categories && previousCategories) {
    const stripTimeSlots = (c: Category) => {
      const { timeSlots: _timeSlots, ...rest } = c;
      return rest;
    };
    const currentByCategory = new Map(
      categories.map((c) => [c.id, stripTimeSlots(c)]),
    );
    const prevByCategory = new Map(
      previousCategories.current.map((c) => [c.id, stripTimeSlots(c)]),
    );
    currentByCategory.forEach((cat, id) => {
      const prev = prevByCategory.get(id);
      if (!prev) {
        databaseChanges.category.create.push(cat);
      } else if (!objectsAreEqual(prev, cat)) {
        databaseChanges.category.update.push(cat);
      }
    });
    prevByCategory.forEach((cat, id) => {
      if (!currentByCategory.has(id)) {
        databaseChanges.category.destroy.push(cat);
      }
    });

    // Time windows are nested under categories in Redux but stored in their
    // own table. Flatten across all categories and diff by window id so
    // reparenting, edits, and removals each surface as a discrete operation.
    // When a category is destroyed the schema sets its windows' categoryId to
    // null (onDelete: SetNull), so we explicitly destroy those windows here
    // rather than leaving orphans — they're already absent from the current
    // category tree and present in the previous one.
    const currentWindows = categories.flatMap((c) => c.timeSlots);
    const prevWindows = previousCategories.current.flatMap((c) => c.timeSlots);
    const currWindowMap = new Map(currentWindows.map((w) => [w.id, w]));
    const prevWindowMap = new Map(prevWindows.map((w) => [w.id, w]));
    currWindowMap.forEach((win, id) => {
      const prev = prevWindowMap.get(id);
      if (!prev) {
        databaseChanges.categoryTimeWindow.create.push(win);
      } else if (!objectsAreEqual(prev, win)) {
        databaseChanges.categoryTimeWindow.update.push(win);
      }
    });
    prevWindowMap.forEach((win, id) => {
      if (!currWindowMap.has(id)) {
        databaseChanges.categoryTimeWindow.destroy.push(win);
      }
    });
  }

  // Travel times. Only update flows through here — create needs a Google
  // distance lookup (handled by refreshAllTravelTimes / fetchMissingTravelTimes)
  // and destroy is handled by location cascade in Prisma.
  if (travelTimes && previousTravelTimes) {
    const currentByTravel = new Map(travelTimes.map((t) => [t.id, t]));
    const prevByTravel = new Map(
      previousTravelTimes.current.map((t) => [t.id, t]),
    );
    currentByTravel.forEach((tt, id) => {
      const prev = prevByTravel.get(id);
      if (!prev) return;
      if (!objectsAreEqual(prev, tt)) {
        databaseChanges.travelTime.update.push(tt);
      }
    });
  }

  // Locations. Only update + destroy flow through here — create needs a
  // Google Places lookup and stays as a direct server action.
  if (locations && previousLocations) {
    const currentByLoc = new Map(locations.map((l) => [l.id, l]));
    const prevByLoc = new Map(
      previousLocations.current.map((l) => [l.id, l]),
    );
    currentByLoc.forEach((loc, id) => {
      const prev = prevByLoc.get(id);
      if (!prev) {
        // Skip — direct createLocation owns this path.
        return;
      }
      if (!objectsAreEqual(prev, loc)) {
        databaseChanges.location.update.push(loc);
      }
    });
    prevByLoc.forEach((loc, id) => {
      if (!currentByLoc.has(id)) {
        databaseChanges.location.destroy.push(loc);
      }
    });
  }

  return databaseChanges;
}
