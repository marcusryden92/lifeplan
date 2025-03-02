import { EventTemplate, findLargestGap } from "@/utils/templateBuilderUtils";

import { getWeekFirstDate } from "@/utils/calendarUtils";
import { WeekDayIntegers } from "@/types/calendarTypes";
import {
  addDateItemsToArray,
  sortPlannersByDeadline,
  populateWeekWithTemplate,
  getDayDifference,
  checkCurrentDateInEvents,
  hasDateInArray,
  getMinuteDifference,
} from "./calendarGenerationHelpers";

import { Planner } from "@/lib/plannerClass";

import cuid from "cuid";
import { getSortedTreeBottomLayer } from "../goalPageHandlers";

// Define the SimpleEvent interface
export interface SimpleEvent {
  id: string;
  title: string;
  start: string; // ISO 8601 string format for FullCalendar
  end: string; // ISO 8601 string format for FullCalendar
  backgroundColor?: string;
  borderColor?: string;
}

export function generateCalendar(
  weekStartDay: WeekDayIntegers,
  template: EventTemplate[],
  taskArray: Planner[]
): SimpleEvent[] {
  let eventArray: SimpleEvent[] = [];

  // Add date items to the task array:
  let newArray = addDateItemsToArray(taskArray, eventArray);

  console.log([...eventArray]);

  if (newArray && newArray.length !== 0) {
    eventArray = newArray;
  }

  // Add tasks and goals to calendar:

  newArray = addEventsToCalendar(weekStartDay, template, taskArray, eventArray);

  eventArray = newArray;

  return eventArray;
}

function addEventsToCalendar(
  weekStartDay: WeekDayIntegers,
  template: EventTemplate[],
  taskArray: Planner[],
  eventArray: SimpleEvent[]
): SimpleEvent[] {
  const todaysDate = new Date();

  // First get all the goals and task events from taskArray:

  let goalsAndTasks: Planner[] = [];

  taskArray.forEach((task) => {
    if (
      (task.type === "goal" && !task.parentId && task.isReady) ||
      task.type === "task"
    ) {
      goalsAndTasks.push(task);
    }
  });

  if (!goalsAndTasks) return eventArray;

  // Then sort the array by due dates (items with no due date end up last):

  const newArray = sortPlannersByDeadline(goalsAndTasks);
  goalsAndTasks = newArray;

  // Create array to hold the first date of all the weeks to which a template has been added (so multiple instances of the template aren't added to the same week):

  let templatedWeeks: Date[] = [];

  // Initialize the first week:

  const weekFirstDate = getWeekFirstDate(weekStartDay, todaysDate);
  templatedWeeks.push(new Date(weekFirstDate));
  eventArray = populateWeekWithTemplate(
    weekStartDay,
    todaysDate,
    template,
    eventArray
  );

  // Find the largest gap in the template to make sure that a given task fits at all within the week template.

  const largestTemplateGap = findLargestGap(template);

  goalsAndTasks.forEach((item) => {
    // If item is a task:
    if (item.type === "task") {
      addTaskToCalendar(
        item,
        largestTemplateGap,
        weekStartDay,
        todaysDate,
        eventArray,
        templatedWeeks,
        template
      );
    } else if (item.type === "goal") {
      addGoalToCalendar(
        taskArray,
        item,
        largestTemplateGap,
        weekStartDay,
        todaysDate,
        eventArray,
        templatedWeeks,
        template
      );
    }
  });

  return eventArray;
}

function addGoalToCalendar(
  taskArray: Planner[],
  item: Planner,
  largestTemplateGap: number,
  weekStartDay: WeekDayIntegers,
  todaysDate: Date,
  eventArray: SimpleEvent[],
  templatedWeeks: Date[],
  template: EventTemplate[]
) {
  const goalBottomLayer = getSortedTreeBottomLayer(taskArray, item.id);

  let startTime: Date | undefined = undefined;

  goalBottomLayer.forEach((item) => {
    startTime = addTaskToCalendar(
      item,
      largestTemplateGap,
      weekStartDay,
      todaysDate,
      eventArray,
      templatedWeeks,
      template,
      startTime
    );
  });
}

function addTaskToCalendar(
  item: Planner,
  largestTemplateGap: number,
  weekStartDay: WeekDayIntegers,
  todaysDate: Date,
  eventArray: SimpleEvent[],
  templatedWeeks: Date[],
  template: EventTemplate[],
  startTime?: Date
) {
  if (!item.duration) {
    console.log(`Task ${item.title} duration unfined.`);
    return;
  }
  // Check that the item fits within the week template:
  if (item.duration > largestTemplateGap) {
    console.log(`Task ${item.title} is too large for the week template!`);
    return;
  }

  // These are the markers that run along the calendar to check for available slots. The static marker is the main marker, and when static marker finds a free minute, moving marker continues along to check if the free space is as long as the task duration:
  let staticMarker = startTime || new Date();
  let movingMarker = new Date(staticMarker);

  // These markers are here to see if we've changed days or weeks:
  let weekMarker = getWeekFirstDate(weekStartDay, staticMarker);

  // Let's make a while loop to iterate through the calendar and check if there are any free slots:

  let iterationCount = 0;

  while (true) {
    // Break the loop if it has run 500 times

    /* if (iterationCount > 500) {
      console.error(
        "Loop exceeded maximum iteration count of 500. Breaking the loop to avoid infinite loop."
      );
      break;
    } */

    // Check if we've changed weeks and add a template to the new week if necessary
    if (getDayDifference(weekMarker, staticMarker) > 6) {
      if (!hasDateInArray(templatedWeeks, staticMarker)) {
        eventArray = populateWeekWithTemplate(
          weekStartDay,
          staticMarker,
          template,
          eventArray
        );
        weekMarker = new Date(getWeekFirstDate(weekStartDay, staticMarker));

        // Add the staticMarker to templatedWeeks after adding the template
        templatedWeeks.push(new Date(staticMarker));
      }
    }

    let eventEndTime;

    // Let's check if today has any events:
    if (eventArray) {
      // Let's check if the movingMarker is inside an event, and if so, get the end time of that event:
      eventEndTime = checkCurrentDateInEvents(eventArray, movingMarker);
    }

    // If the movingMarker is inside an event, set the duration and staticMarker to the end-time of that event:
    if (eventEndTime) {
      staticMarker = new Date(eventEndTime);
      movingMarker = new Date(eventEndTime);

      // Add one minute to movingMarker to keep it from getting stuck in the same event:
      movingMarker.setMinutes(movingMarker.getMinutes() + 1);
      iterationCount++;

      continue;
    }

    if (
      !eventEndTime &&
      getMinuteDifference(staticMarker, movingMarker) >= item.duration
    ) {
      // Correct for pushing the marker forwards one minute
      const startTime = new Date(
        staticMarker.setMinutes(movingMarker.getMinutes())
      );
      const endTime = new Date(
        movingMarker.setMinutes(movingMarker.getMinutes())
      );

      const newEvent = {
        id: cuid(),
        title: item.title,
        start: startTime.toISOString(), // ISO 8601 string format for FullCalendar
        end: endTime.toISOString(), // ISO 8601 string format for FullCalendar
        backgroundColor: "#f59e0b",
        borderColor: "transparent",
      };

      eventArray.push(newEvent);
      movingMarker.setMinutes(movingMarker.getMinutes());
      return movingMarker;
    }

    movingMarker.setMinutes(movingMarker.getMinutes() + 1);

    iterationCount++;
  }
}
