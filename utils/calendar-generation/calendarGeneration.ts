import { EventTemplate, findLargestGap } from "@/utils/templateBuilderUtils";

import { getWeekFirstDate } from "@/utils/calendarUtils";
import { WeekDayIntegers } from "@/types/calendarTypes";
import {
  addDateItemsToArray,
  sortPlannersByDeadline,
  checkCurrentDateInEvents,
  getMinuteDifference,
  addCompletedItemsToArray,
} from "./calendarGenerationHelpers";
import {
  addWeekTemplateToCalendar,
  populateWeekWithTemplate,
} from "./weekTemplateGeneration";
import { SimpleEvent } from "@/types/calendarTypes";

import { getDayDifference, hasDateInArray } from "./calendarGenerationHelpers";

import { Planner } from "@/lib/plannerClass";

import { getSortedTreeBottomLayer } from "../goalPageHandlers";
import { taskIsCompleted } from "../taskHelpers";

export function generateCalendar(
  weekStartDay: WeekDayIntegers,
  template: EventTemplate[],
  mainPlanner: Planner[],
  prevCalendar: SimpleEvent[]
): SimpleEvent[] {
  let eventArray: SimpleEvent[] = [];
  const currentDate = new Date();

  const memoizedEventIds = new Set<string>();

  // Add unfinished events from previous calendar to new calendar
  if (prevCalendar.length > 0) {
    const memoizedEvents = prevCalendar.filter(
      (e) => currentDate > new Date(e.start) && !e.extendedProps.isTemplateItem
    );

    // Add IDs to the set
    memoizedEvents.forEach((e) => {
      memoizedEventIds.add(e.id);
    });

    eventArray.push(...memoizedEvents);
  }

  // Add date items to the event array:
  addDateItemsToArray(mainPlanner, eventArray, memoizedEventIds);

  // Add completed items to the event array:
  addCompletedItemsToArray(mainPlanner, eventArray, memoizedEventIds);

  // Add template items to the event array
  if (template.length > 0) {
    addWeekTemplateToCalendar(weekStartDay, currentDate, template, eventArray);
  }

  // Create array to hold the first date of all the weeks
  // to which a template has been added
  // (so multiple instances of the template aren't added to the same week):
  const templateEventsArray: SimpleEvent[] = [];
  const templatedWeeks: Date[] = [];

  // Initialize the first week:
  const weekFirstDate = getWeekFirstDate(weekStartDay, currentDate);
  templatedWeeks.push(new Date(weekFirstDate));
  populateWeekWithTemplate(
    weekStartDay,
    currentDate,
    template,
    templateEventsArray
  );

  // Find the largest gap in the template
  // to make sure that a given task fits at all
  // within the week template.
  const largestTemplateGap = findLargestGap(template);

  // Add tasks and goals to the event array:
  eventArray = addEventsToCalendar(
    weekStartDay,
    template,
    templateEventsArray,
    templatedWeeks,
    largestTemplateGap,
    mainPlanner,
    eventArray,
    memoizedEventIds
  );

  return eventArray;
}

function addEventsToCalendar(
  weekStartDay: WeekDayIntegers,
  template: EventTemplate[],
  templateEventsArray: SimpleEvent[],
  templatedWeeks: Date[],
  largestTemplateGap: number | undefined,
  mainPlanner: Planner[],
  eventArray: SimpleEvent[],
  memoizedEventIds: Set<string>
): SimpleEvent[] {
  // First get all the goals and task events from mainPlanner:
  let goalsAndTasks: Planner[] = [];

  mainPlanner.forEach((task) => {
    if (
      (task.type === "goal" && !task.parentId && task.isReady) ||
      task.type === "task"
    ) {
      goalsAndTasks.push(task);
    }
  });

  if (!goalsAndTasks) return eventArray;

  // Then sort the array by due dates
  // (items with no due date end up last):
  const newArray = sortPlannersByDeadline(goalsAndTasks);
  goalsAndTasks = newArray;

  goalsAndTasks.forEach((item) => {
    // If item is a task:
    if (item.type === "task" && !memoizedEventIds.has(item.id)) {
      addTaskToCalendar(
        item,
        largestTemplateGap,
        weekStartDay,
        eventArray,
        template,
        templateEventsArray,
        templatedWeeks
      );
    }
    // If Item is a goal:
    else if (item.type === "goal") {
      addGoalToCalendar(
        mainPlanner,
        item,
        largestTemplateGap,
        weekStartDay,
        eventArray,
        template,
        templateEventsArray,
        templatedWeeks,
        memoizedEventIds
      );
    }
  });

  return eventArray;
}

function addGoalToCalendar(
  mainPlanner: Planner[],
  rootItem: Planner,
  largestTemplateGap: number | undefined,
  weekStartDay: WeekDayIntegers,
  eventArray: SimpleEvent[],
  template: EventTemplate[],
  templateEventsArray: SimpleEvent[],
  templatedWeeks: Date[],
  memoizedEventIds: Set<string>
) {
  const goalBottomLayer = getSortedTreeBottomLayer(mainPlanner, rootItem.id);
  const filteredTasks = goalBottomLayer.filter(
    (task) => !taskIsCompleted(task) && !memoizedEventIds.has(task.id)
  );

  let startTime: Date | undefined = undefined;

  filteredTasks.forEach((item) => {
    startTime = addTaskToCalendar(
      item,
      largestTemplateGap,
      weekStartDay,
      eventArray,
      template,
      templateEventsArray,
      templatedWeeks,
      startTime
    );
  });
}

function addTaskToCalendar(
  item: Planner,
  largestTemplateGap: number | undefined,
  weekStartDay: WeekDayIntegers,
  eventArray: SimpleEvent[],
  template: EventTemplate[],
  templateEventsArray: SimpleEvent[],
  templatedWeeks: Date[],
  startTime?: Date
) {
  if (!item.duration) {
    console.log(`Task ${item.title} duration undefined.`);
    return;
  }

  // Check that the item fits within the week template:
  if (largestTemplateGap && item.duration > largestTemplateGap) {
    console.log(`Task ${item.title} is too large for the week template!`);
    return;
  }

  // These are the markers that run along the calendar
  // to check for available slots. The static marker is
  // the main marker, and when static marker finds a free minute,
  // moving marker continues along to check if the free space
  // is as long as the task duration:
  let staticMarker = startTime || new Date();
  let movingMarker = new Date(staticMarker);

  // This marker is here to see if we've changed weeks:
  let weekMarker = getWeekFirstDate(weekStartDay, staticMarker);

  // Let's make a while loop to iterate through
  // the calendar and check if there are any free slots:
  let iterationCount = 0;

  while (true) {
    // Break the loop if it has run 500 times
    if (iterationCount > 1000) {
      console.error(
        "Loop exceeded maximum iteration count of 1000. Breaking the loop to avoid infinite loop."
      );
      break;
    }

    // Check if we've changed weeks and add a template to the new week if necessary
    if (getDayDifference(weekMarker, staticMarker) > 6) {
      if (!hasDateInArray(templatedWeeks, staticMarker)) {
        populateWeekWithTemplate(
          weekStartDay,
          staticMarker,
          template,
          templateEventsArray
        );
        weekMarker = new Date(getWeekFirstDate(weekStartDay, staticMarker));

        // Add the staticMarker to templatedWeeks after adding the template
        templatedWeeks.push(new Date(staticMarker));
      }
    }

    // Check if the movingMarker is inside a template event
    let eventEndTime = null;
    if (templateEventsArray.length > 0) {
      eventEndTime = checkCurrentDateInEvents(
        templateEventsArray,
        movingMarker
      );
    }

    // If not in a template event, check regular events
    if (!eventEndTime && eventArray.length > 0) {
      eventEndTime = checkCurrentDateInEvents(eventArray, movingMarker);
    }

    // If found in either event array, move markers forward
    if (eventEndTime) {
      staticMarker = new Date(eventEndTime);
      movingMarker = new Date(eventEndTime);
      movingMarker.setMinutes(movingMarker.getMinutes() + 1);
      iterationCount++;
      continue;
    }

    if (
      !eventEndTime &&
      getMinuteDifference(staticMarker, movingMarker) >= item.duration
    ) {
      const startTime = new Date(staticMarker);
      const endTime = new Date(movingMarker);

      const newEvent: SimpleEvent = {
        id: item.id,
        title: item.title,
        start: startTime.toISOString(), // ISO 8601 string format for FullCalendar
        end: endTime.toISOString(), // ISO 8601 string format for FullCalendar
        backgroundColor: "#f59e0b",
        borderColor: "transparent",
        extendedProps: { isTemplateItem: false },
      };

      eventArray.push(newEvent);
      movingMarker.setMinutes(movingMarker.getMinutes());
      return movingMarker;
    }

    movingMarker.setMinutes(movingMarker.getMinutes() + 1);

    iterationCount++;
  }
}
