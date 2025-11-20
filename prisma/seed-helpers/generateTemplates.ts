import { EventTemplate } from "../generated/client";
import { WeekDayType } from "@/types/calendarTypes";
import { v4 as uuidv4 } from "uuid";

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

  // Morning sleep (00:00 - 06:00) - All days
  for (let i = 0; i < days.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Sleep",
      startDay: days[i] as WeekDayType,
      startTime: "00:00",
      duration: 360,
      color: "#1D3557", // navy
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  // Evening sleep (21:00 - 00:00) - All days
  for (let i = 0; i < days.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Sleep",
      startDay: days[i] as WeekDayType,
      startTime: "21:00",
      duration: 180,
      color: "#1D3557", // navy
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  // Lunch break (12:00 - 13:00) - All days
  for (let i = 0; i < days.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Lunch Break",
      startDay: days[i] as WeekDayType,
      startTime: "12:00",
      duration: 60,
      color: "#F4A261", // warm sand
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  // Breakfast (07:00 - 07:30) - All days
  for (let i = 0; i < days.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Breakfast",
      startDay: days[i] as WeekDayType,
      startTime: "07:00",
      duration: 30,
      color: "#FFB703", // amber yellow
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  // Dinner (18:00 - 19:00) - All days
  for (let i = 0; i < days.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Dinner",
      startDay: days[i] as WeekDayType,
      startTime: "18:00",
      duration: 60,
      color: "#D35400", // burnt orange
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  // Work Morning Session (09:00 - 12:00) - Weekdays only
  for (let i = 0; i < weekdays.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Work",
      startDay: weekdays[i] as WeekDayType,
      startTime: "09:00",
      duration: 180,
      color: "#1976D2", // royal blue
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
      startTime: "13:00",
      duration: 240,
      color: "#1976D2", // royal blue
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  // Morning workout (06:30 - 07:30) - Monday, Wednesday, Friday
  const workoutDays = [days[1], days[3], days[5]]; // Mon, Wed, Fri
  for (let i = 0; i < workoutDays.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Morning Workout",
      startDay: workoutDays[i] as WeekDayType,
      startTime: "06:30",
      duration: 60,
      color: "#27AE60", // emerald
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  // Evening workout (19:30 - 20:30) - Tuesday, Thursday
  const eveningWorkoutDays = [days[2], days[4]]; // Tue, Thu
  for (let i = 0; i < eveningWorkoutDays.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId,
      title: "Evening Workout",
      startDay: eveningWorkoutDays[i] as WeekDayType,
      startTime: "19:30",
      duration: 60,
      color: "#2E7D32", // forest green
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  // Cleaning (10:00 - 11:30) - Saturday
  templateArray.push({
    id: uuidv4(),
    userId,
    title: "House Cleaning",
    startDay: "saturday" as WeekDayType,
    startTime: "10:00",
    duration: 90,
    color: "#16A085", // teal green
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  // Laundry (14:00 - 15:30) - Sunday
  templateArray.push({
    id: uuidv4(),
    userId,
    title: "Laundry",
    startDay: "sunday" as WeekDayType,
    startTime: "14:00",
    duration: 90,
    color: "#20C997", // turquoise
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  // Grocery shopping (11:00 - 12:30) - Saturday
  templateArray.push({
    id: uuidv4(),
    userId,
    title: "Grocery Shopping",
    startDay: "saturday" as WeekDayType,
    startTime: "11:00",
    duration: 90,
    color: "#8E44AD", // deep purple
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return templateArray;
};
