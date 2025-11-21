import { Planner } from "../generated/client";
import { v4 as uuidv4 } from "uuid";

/**
 * Simplified plan data structure.
 * Plans are scheduled tasks with specific start times relative to the week.
 */
export interface SimplePlanData {
  title: string;
  color: string;
  duration: number;
  // Day offset from Monday (0 = Monday, 1 = Tuesday, etc.)
  dayOffset: number;
  // Start time in HH:MM format
  startTime: string;
}

/**
 * Seed data for plan-type planners (scheduled tasks).
 * These will be positioned at specific times within the current week.
 */
export const planSeedData: SimplePlanData[] = [
  // Monday plans
  {
    title: "Morning Review",
    color: "#E74C3C",
    duration: 30,
    dayOffset: 0, // Monday
    startTime: "09:00",
  },
  {
    title: "Project Work",
    color: "#3498DB",
    duration: 120,
    dayOffset: 0, // Monday
    startTime: "10:00",
  },

  // Tuesday plans
  {
    title: "Team Meeting",
    color: "#9B59B6",
    duration: 60,
    dayOffset: 1, // Tuesday
    startTime: "14:00",
  },

  // Wednesday plans
  {
    title: "Deep Work Session",
    color: "#1ABC9C",
    duration: 180,
    dayOffset: 2, // Wednesday
    startTime: "09:00",
  },

  // Friday plans
  {
    title: "Weekly Planning",
    color: "#F39C12",
    duration: 45,
    dayOffset: 4, // Friday
    startTime: "16:00",
  },
];

/**
 * Get the Monday of the current week.
 * This is a copy of the function from calendarUtils to avoid import issues in the seed context.
 */
function getDateOfThisWeeksMonday(todaysDate: Date): Date {
  const dayOfWeek = todaysDate.getDay();
  const daysToMonday = (dayOfWeek + 6) % 7;
  const result = new Date(todaysDate);
  result.setDate(result.getDate() - daysToMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Calculate the start datetime for a plan based on the current week's Monday.
 */
function calculatePlanStartTime(
  mondayDate: Date,
  dayOffset: number,
  startTime: string
): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const planDate = new Date(mondayDate);
  planDate.setDate(planDate.getDate() + dayOffset);
  planDate.setHours(hours, minutes, 0, 0);
  return planDate.toISOString();
}

/**
 * Generates full Planner objects of type 'plan' from simplified seed data.
 * Plans are dynamically positioned based on the current week's Monday,
 * so they always appear at the same relative times within the week.
 */
export const generatePlans = (userId: string): Planner[] => {
  const timestamp = new Date().toISOString();
  const mondayDate = getDateOfThisWeeksMonday(new Date());

  return planSeedData.map((data) => {
    const starts = calculatePlanStartTime(
      mondayDate,
      data.dayOffset,
      data.startTime
    );

    return {
      id: uuidv4(),
      title: data.title,
      parentId: null,
      itemType: "plan" as const,
      isReady: true,
      duration: data.duration,
      deadline: null,
      starts,
      dependency: null,
      completedStartTime: null,
      completedEndTime: null,
      priority: 5,
      userId,
      color: data.color,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
};
