import { EventTemplate } from "../generated/client";
import { WeekDayType } from "@/types/calendarTypes";
import { v4 as uuidv4 } from "uuid";
import { LOCATION_IDS } from "./generateLocations";

const days = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/**
 * Generates event templates for seeding the database.
 * Creates recurring templates for sleep, meals, work, exercise, and household activities.
 */
export const generateTemplates = (userId: string): EventTemplate[] => {
  const templateArray: EventTemplate[] = [];
  const timestamp = new Date().toISOString();

  const weekdays = days.slice(1, 6); // Monday - Friday

  // Morning sleep (00:00 - 06:00) - All days except Thursday and Friday
  const morningSleepDays = days.filter(
    (d) => d !== "thursday" && d !== "friday",
  );
  for (const day of morningSleepDays) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Sleep",
      startDay: day as WeekDayType,
      startTime: "00:00",
      duration: 360,
      color: "#1D3557", // navy
      locationId: LOCATION_IDS.HOME,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  // Evening sleep (21:00 - 00:00) - All days except Wednesday and Thursday
  const eveningSleepDays = days.filter(
    (d) => d !== "wednesday" && d !== "thursday",
  );
  for (const day of eveningSleepDays) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Sleep",
      startDay: day as WeekDayType,
      startTime: "21:00",
      duration: 180,
      color: "#1D3557", // navy
      locationId: LOCATION_IDS.HOME,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  // Late-night sleep (Thursday 03:00 - 06:00)
  templateArray.push({
    id: uuidv4(),
    userId,
    title: "Sleep",
    startDay: "thursday" as WeekDayType,
    startTime: "03:00",
    duration: 180,
    color: "#1D3557", // navy
    locationId: LOCATION_IDS.HOME,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  // Lunch break (12:00 - 13:00) - All days
  /*  for (let i = 0; i < days.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Lunch Break",
      startDay: days[i] as WeekDayType,
      startTime: "12:00",
      duration: 60,
      color: "#F4A261", // warm sand
      locationId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  } */

  // Dinner (18:00 - 19:00) - All days
  /*  for (let i = 0; i < days.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Dinner",
      startDay: days[i] as WeekDayType,
      startTime: "18:00",
      duration: 60,
      color: "#D35400", // burnt orange
      locationId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  } */

  // Work Morning Session (08:00 - 12:00) - Weekdays only
  /* for (let i = 0; i < weekdays.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Work",
      startDay: weekdays[i] as WeekDayType,
      startTime: "08:00",
      duration: 30,
      color: "#1976D2", // royal blue
      locationId: LOCATION_IDS.WORK,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  // Work Afternoon Session (13:00 - 17:00) - Weekdays only
  for (let i = 0; i < weekdays.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Work",
      startDay: weekdays[i] as WeekDayType,
      startTime: "16:00",
      duration: 30,
      color: "#1976D2", // royal blue
      locationId: LOCATION_IDS.WORK,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  } */

  // Morning workout (06:30 - 07:30) - Monday, Wednesday, Friday
  /* const workoutDays = [days[1], days[3], days[5]]; // Mon, Wed, Fri
  for (let i = 0; i < workoutDays.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Morning Workout",
      startDay: workoutDays[i] as WeekDayType,
      startTime: "06:30",
      duration: 60,
      color: "#27AE60", // emerald
      locationId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  } */

  // Evening workout (19:30 - 20:30) - Tuesday, Thursday
  /*   const eveningWorkoutDays = [days[2], days[4]]; // Tue, Thu
  for (let i = 0; i < eveningWorkoutDays.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Evening Workout",
      startDay: eveningWorkoutDays[i] as WeekDayType,
      startTime: "19:30",
      duration: 60,
      color: "#2E7D32", // forest green
      locationId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
 */
  return templateArray;
};
