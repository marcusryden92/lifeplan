import { SimpleEvent } from "@/types/prisma";
import { Planner } from "@/types/prisma";
import { taskIsCompleted } from "../taskHelpers";
import { v4 as uuidv4 } from "uuid";

export function addPlanItemsToArray(
  userId: string,
  planner: Planner[],
  eventArray: SimpleEvent[],
  memoizedEventIds: Set<string>
) {
  const planItems: Planner[] = [];
  const newArray: SimpleEvent[] = [];

  if (!planner || !eventArray) {
    return [];
  }

  // Filter out tasks that are of type "plan"
  planner.forEach((task) => {
    if (task.itemType === "plan" && !memoizedEventIds.has(task.id)) {
      planItems.push(task);
    }
  });

  if (planItems.length === 0) {
    return [];
  }

  // Process each date item and calculate the end date based on duration (in minutes)
  planItems.forEach((plan) => {
    if (plan.starts && plan.duration) {
      // Calculate the end time by adding duration (in minutes) to the start time
      const end = new Date(
        new Date(plan.starts).getTime() + plan.duration * 60000
      ); // 60000 ms = 1 minute

      const now = new Date();

      const newDate: SimpleEvent = {
        userId,
        title: plan.title,
        id: plan.id,
        start: plan.starts,
        end: end.toISOString(), // Add the calculated end time here
        extendedProps: {
          id: uuidv4(),
          eventId: plan.id,
          itemType: "plan",
          parentId: null,
          completedEndTime: null,
          completedStartTime: null,
        },
        backgroundColor: "black",
        borderColor: "black",
        duration: null,
        rrule: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      newArray.push(newDate);
    }
  });

  eventArray.push(...newArray); // Add the new dates to eventArray
}

export function addCompletedItemsToArray(
  userId: string,
  planner: Planner[],
  eventArray: SimpleEvent[],
  memoizedEventIds: Set<string>
) {
  const completedItems: Planner[] = [];
  const newArray: SimpleEvent[] = [];

  if (!planner || !eventArray) {
    return [];
  }

  // Filter out tasks that  not completed
  planner.forEach((task) => {
    if (taskIsCompleted(task) && !memoizedEventIds.has(task.id)) {
      completedItems.push(task);
    }
  });

  if (completedItems.length === 0) {
    return [];
  }

  // Process each date item and calculate the end date based on duration (in minutes)
  completedItems.forEach((item) => {
    if (item.completedStartTime && item.completedEndTime) {
      // Calculate the end time by adding duration (in minutes) to the start time

      const now = new Date();

      const newDate: SimpleEvent = {
        userId,
        title: item.title,
        id: item.id,
        start: item.completedStartTime,
        end: item.completedEndTime, // Add the calculated end time here
        backgroundColor: item.color as string,
        borderColor: "",
        duration: null,
        rrule: null,
        extendedProps: {
          id: uuidv4(),
          eventId: item.id,
          itemType: item.itemType,
          completedStartTime: item.completedStartTime,
          completedEndTime: item.completedEndTime,
          parentId: item.parentId ?? null,
        },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      newArray.push(newDate);
    }
  });

  eventArray.push(...newArray); // Add the new dates to eventArray
}

// Function to check if the current date is within any events and return the end time as a Date
export function checkCurrentDateInEvents(
  events: SimpleEvent[],
  currentDate: Date
): Date | null {
  const currentTime = Math.floor(currentDate.getTime() / 1000); // Get current time in milliseconds

  for (const event of events) {
    const eventStartTime = Math.floor(new Date(event.start).getTime() / 1000);
    const eventEndTime = Math.floor(new Date(event.end).getTime() / 1000);

    // Check if current time is within the event time range
    if (currentTime > eventStartTime && currentTime < eventEndTime) {
      return new Date(event.end); // Return the end time as a Date object
    }
  }

  return null; // Return null if no event matches the current date
}

// Minutes between dates:
export function getMinuteDifference(date1: Date, date2: Date): number {
  // Get the time in milliseconds
  const time1 = date1.getTime();
  const time2 = date2.getTime();

  // Calculate the difference in milliseconds
  const differenceInMilliseconds = Math.abs(time2 - time1);

  // Convert milliseconds to minutes
  const differenceInMinutes = Math.floor(
    differenceInMilliseconds / (1000 * 60)
  );

  return differenceInMinutes;
}

export function getDayDifference(date1: Date, date2: Date): number {
  // Reset the time part to 00:00:00 for both dates to only compare the calendar day
  const day1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const day2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());

  // Calculate the difference in milliseconds between the two days
  const differenceInMilliseconds = day2.getTime() - day1.getTime();

  // Convert milliseconds to days and return the result
  return Math.floor(differenceInMilliseconds / (1000 * 60 * 60 * 24));
}

export function hasDateInArray(dates: Date[], dateToCheck: Date): boolean {
  return dates.some((date): date is Date => {
    if (date === undefined) return false;
    return (
      date.getFullYear() === dateToCheck.getFullYear() &&
      date.getMonth() === dateToCheck.getMonth() &&
      date.getDate() === dateToCheck.getDate()
    );
  });
}

export function getTodaysEvents(
  today: Date,
  eventArray: SimpleEvent[]
): SimpleEvent[] {
  const todaysEvents: SimpleEvent[] = [];

  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0); // Set time to 00:00 of the given day
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999); // Set time to 23:59 of the given day

  eventArray.forEach((event) => {
    const eventStartDate = new Date(event.start);
    const eventEndDate = new Date(event.end);

    // Check if the event overlaps with any part of the day
    if (
      eventStartDate <= endOfDay &&
      eventEndDate >= startOfDay // Event starts before or during today and ends after or during today
    ) {
      todaysEvents.push(event);
    }
  });

  return todaysEvents;
}

export function getEventsForDates(dates: Date[], eventArray: SimpleEvent[]) {
  const events: SimpleEvent[] = [];

  for (const date of dates) {
    events.push(...getTodaysEvents(date, eventArray));
  }

  return events;
}

export function sortByDeadline(newArray: Planner[]): Planner[] {
  return newArray.sort((a, b) => {
    const deadlineA = a.deadline ? new Date(a.deadline) : Infinity;
    const deadlineB = b.deadline ? new Date(b.deadline) : Infinity;

    // Make sure deadlineA and deadlineB are Dates before using getTime
    return (
      (deadlineA instanceof Date ? deadlineA.getTime() : Infinity) -
      (deadlineB instanceof Date ? deadlineB.getTime() : Infinity)
    );
  });
}
