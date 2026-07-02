"use client";

import {
  Planner,
  SimpleEvent,
  EventTemplate,
  EventExtendedProps,
  Category,
  CategoryTimeWindow,
  CategoryEvent,
  TravelEvent,
  EngineMessage,
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
type CategoryEventChange = CategoryEvent;
type TravelEventChange = TravelEvent;
type EngineMessageChange = EngineMessage;
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
  categoryEvent: ChangeGroup<CategoryEventChange>;
  travelEvent: ChangeGroup<TravelEventChange>;
  engineMessage: ChangeGroup<EngineMessageChange>;
  location: ChangeGroup<LocationChange>;
  travelTime: ChangeGroup<TravelTimeChange>;
};

export async function handleServerTransaction(
  clientKnownDataVersion: number,
  planner: Planner[],
  previousPlanner: { current: Planner[] },
  calendar: SimpleEvent[],
  previousCalendar: { current: SimpleEvent[] },
  template?: EventTemplate[],
  previousTemplate?: { current: EventTemplate[] },
  categories?: Category[],
  previousCategories?: { current: Category[] },
  categoryEvents?: CategoryEvent[],
  previousCategoryEvents?: { current: CategoryEvent[] },
  travelEvents?: TravelEvent[],
  previousTravelEvents?: { current: TravelEvent[] },
  engineMessages?: EngineMessage[],
  previousEngineMessages?: { current: EngineMessage[] },
  locations?: SerializedLocation[],
  previousLocations?: { current: SerializedLocation[] },
  travelTimes?: SerializedTravelTime[],
  previousTravelTimes?: { current: SerializedTravelTime[] },
) {
  // Templates, category wrappers, and travel events no longer enter
  // state.calendar.calendar — they live in their own redux slice fields and
  // their own sync diff groups. SimpleEvent[] now only carries plans +
  // scheduled tasks, so no filter is needed before the diff.
  const serializedPlanner = JSON.parse(JSON.stringify(planner)) as Planner[];
  const serializedPreviousPlanner = {
    current: JSON.parse(JSON.stringify(previousPlanner.current)) as Planner[],
  };
  const serializedCalendar = JSON.parse(
    JSON.stringify(calendar),
  ) as SimpleEvent[];
  const serializedPreviousCalendar = {
    current: JSON.parse(
      JSON.stringify(previousCalendar.current),
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
  const serializedCategoryEvents = categoryEvents
    ? (JSON.parse(JSON.stringify(categoryEvents)) as CategoryEvent[])
    : undefined;
  const serializedPreviousCategoryEvents = previousCategoryEvents
    ? {
        current: JSON.parse(
          JSON.stringify(previousCategoryEvents.current),
        ) as CategoryEvent[],
      }
    : undefined;
  const serializedTravelEvents = travelEvents
    ? (JSON.parse(JSON.stringify(travelEvents)) as TravelEvent[])
    : undefined;
  const serializedPreviousTravelEvents = previousTravelEvents
    ? {
        current: JSON.parse(
          JSON.stringify(previousTravelEvents.current),
        ) as TravelEvent[],
      }
    : undefined;
  const serializedEngineMessages = engineMessages
    ? (JSON.parse(JSON.stringify(engineMessages)) as EngineMessage[])
    : undefined;
  const serializedPreviousEngineMessages = previousEngineMessages
    ? {
        current: JSON.parse(
          JSON.stringify(previousEngineMessages.current),
        ) as EngineMessage[],
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
    serializedCategoryEvents,
    serializedPreviousCategoryEvents,
    serializedTravelEvents,
    serializedPreviousTravelEvents,
    serializedEngineMessages,
    serializedPreviousEngineMessages,
    serializedLocations,
    serializedPreviousLocations,
    serializedTravelTimes,
    serializedPreviousTravelTimes,
  );

  const response = await syncCalendarData(
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
  categoryEvents?: CategoryEvent[],
  previousCategoryEvents?: { current: CategoryEvent[] },
  travelEvents?: TravelEvent[],
  previousTravelEvents?: { current: TravelEvent[] },
  engineMessages?: EngineMessage[],
  previousEngineMessages?: { current: EngineMessage[] },
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
    categoryEvent: { create: [], update: [], destroy: [] },
    travelEvent: { create: [], update: [], destroy: [] },
    engineMessage: { create: [], update: [], destroy: [] },
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

  // Engine emits empty createdAt/updatedAt; DB owns those fields. Strip on
  // both sides so engine output and DB-loaded rows compare cleanly.
  const stripDbMetadata = <
    T extends { createdAt?: string; updatedAt?: string },
  >(
    e: T,
  ) => {
    const { createdAt: _c, updatedAt: _u, ...rest } = e;
    return rest;
  };

  if (categoryEvents && previousCategoryEvents) {
    const currByEvent = new Map(categoryEvents.map((e) => [e.id, e]));
    const prevByEvent = new Map(
      previousCategoryEvents.current.map((e) => [e.id, e]),
    );
    currByEvent.forEach((ev, id) => {
      const prev = prevByEvent.get(id);
      if (!prev) {
        databaseChanges.categoryEvent.create.push(ev);
      } else if (!objectsAreEqual(stripDbMetadata(prev), stripDbMetadata(ev))) {
        databaseChanges.categoryEvent.update.push(ev);
      }
    });
    prevByEvent.forEach((ev, id) => {
      if (!currByEvent.has(id)) {
        databaseChanges.categoryEvent.destroy.push(ev);
      }
    });
  }

  if (travelEvents && previousTravelEvents) {
    const currByTravel = new Map(travelEvents.map((e) => [e.id, e]));
    const prevByTravel = new Map(
      previousTravelEvents.current.map((e) => [e.id, e]),
    );
    currByTravel.forEach((ev, id) => {
      const prev = prevByTravel.get(id);
      if (!prev) {
        databaseChanges.travelEvent.create.push(ev);
      } else if (!objectsAreEqual(stripDbMetadata(prev), stripDbMetadata(ev))) {
        databaseChanges.travelEvent.update.push(ev);
      }
    });
    prevByTravel.forEach((ev, id) => {
      if (!currByTravel.has(id)) {
        databaseChanges.travelEvent.destroy.push(ev);
      }
    });
  }

  if (engineMessages && previousEngineMessages) {
    const currByMessage = new Map(engineMessages.map((m) => [m.id, m]));
    const prevByMessage = new Map(
      previousEngineMessages.current.map((m) => [m.id, m]),
    );
    currByMessage.forEach((m, id) => {
      const prev = prevByMessage.get(id);
      if (!prev) {
        databaseChanges.engineMessage.create.push(m);
      } else if (!objectsAreEqual(stripDbMetadata(prev), stripDbMetadata(m))) {
        databaseChanges.engineMessage.update.push(m);
      }
    });
    prevByMessage.forEach((m, id) => {
      if (!currByMessage.has(id)) {
        databaseChanges.engineMessage.destroy.push(m);
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
