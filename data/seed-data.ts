import { Planner } from "@/lib/planner-class";

import uuidv4 from "uuid";

export const templateSeed = [
  {
    id: "1",
    title: "Sleep",
    start: {
      day: "monday",
      time: "00:00",
    },
    duration: 360, // 6 hours
  },
  {
    id: "sleep-end-1",
    title: "Sleep",
    start: {
      day: "monday",
      time: "21:00",
    },
    duration: 180, // 3 hours (21:00 to 00:00 next day)
  },
  {
    id: "lunch-1",
    title: "Lunch",
    start: {
      day: "monday",
      time: "12:00",
    },
    duration: 60, // 1 hour
  },
  {
    id: "2",
    title: "Sleep",
    start: {
      day: "tuesday",
      time: "00:00",
    },
    duration: 360, // 6 hours
  },
  {
    id: "sleep-end-2",
    title: "Sleep",
    start: {
      day: "tuesday",
      time: "21:00",
    },
    duration: 180, // 3 hours (21:00 to 00:00 next day)
  },
  {
    id: "lunch-2",
    title: "Lunch",
    start: {
      day: "tuesday",
      time: "12:00",
    },
    duration: 60, // 1 hour
  },
  {
    id: "3",
    title: "Sleep",
    start: {
      day: "wednesday",
      time: "00:00",
    },
    duration: 360, // 6 hours
  },
  {
    id: "sleep-end-3",
    title: "Sleep",
    start: {
      day: "wednesday",
      time: "21:00",
    },
    duration: 180, // 3 hours (21:00 to 00:00 next day)
  },
  {
    id: "lunch-3",
    title: "Lunch",
    start: {
      day: "wednesday",
      time: "12:00",
    },
    duration: 60, // 1 hour
  },
  {
    id: "4",
    title: "Sleep",
    start: {
      day: "thursday",
      time: "00:00",
    },
    duration: 360, // 6 hours
  },
  {
    id: "sleep-end-4",
    title: "Sleep",
    start: {
      day: "thursday",
      time: "21:00",
    },
    duration: 180, // 3 hours (21:00 to 00:00 next day)
  },
  {
    id: "lunch-4",
    title: "Lunch",
    start: {
      day: "thursday",
      time: "12:00",
    },
    duration: 60, // 1 hour
  },
  {
    id: "5",
    title: "Sleep",
    start: {
      day: "friday",
      time: "00:00",
    },
    duration: 360, // 6 hours
  },
  {
    id: "sleep-end-5",
    title: "Sleep",
    start: {
      day: "friday",
      time: "21:00",
    },
    duration: 180, // 3 hours (21:00 to 00:00 next day)
  },
  {
    id: "lunch-5",
    title: "Lunch",
    start: {
      day: "friday",
      time: "12:00",
    },
    duration: 60, // 1 hour
  },
  {
    id: "6",
    title: "Sleep",
    start: {
      day: "saturday",
      time: "00:00",
    },
    duration: 360, // 6 hours
  },
  {
    id: "sleep-end-6",
    title: "Sleep",
    start: {
      day: "saturday",
      time: "19:00",
    },
    duration: 300, // 3 hours (21:00 to 00:00 next day)
  },
  {
    id: "lunch-6",
    title: "Lunch",
    start: {
      day: "saturday",
      time: "12:00",
    },
    duration: 60, // 1 hour
  },
  {
    id: "7",
    title: "Sleep",
    start: {
      day: "sunday",
      time: "00:00",
    },
    duration: 1440, // 6 hours
  },
  /* {
    id: "sleep-end-7",
    title: "Sleep",
    start: {
      day: "sunday",
      time: "21:00",
    },
    duration: 180, // 3 hours (21:00 to 00:00 next day)
  },
  {
    id: "lunch-7",
    title: "Lunch",
    start: {
      day: "sunday",
      time: "12:00",
    },
    duration: 60, // 1 hour
  }, */
];

export const taskArraySeed: Planner[] = [
  {
    title: "Grocery Shopping",
    id: "001",
    type: "task",
    canInfluence: true,
    duration: 40,
    deadline: undefined,
    starts: undefined,
  },
  {
    title: "Meal Prep",
    id: "002",
    type: "task",
    canInfluence: true,
    duration: 40,
    deadline: undefined,
    starts: undefined,
  },
  {
    title: "House Cleaning",
    id: "003",
    type: "task",
    canInfluence: true,
    duration: 120,
    deadline: new Date(),
    starts: undefined,
  },
  {
    title: "Complete Spring Cleaning",
    id: "004",
    type: "goal",
    canInfluence: true,
    duration: 120,
    deadline: new Date(),
    starts: undefined,
  },
  {
    title: "Organize Storage Room",
    id: "005",
    parentId: "004", // Child of "Complete Spring Cleaning"
    type: "goal",
    canInfluence: true,
    duration: 120,
    deadline: new Date(),
    starts: undefined,
  },
  {
    title: "Sort Old Boxes",
    id: "006",
    parentId: "005", // Child of "Organize Storage Room"
    type: "goal",
    canInfluence: true,
    duration: 13,
    deadline: new Date(),
    starts: undefined,
  },
  {
    title: "Label Boxes",
    id: "007", // Unique id for TaskA
    parentId: "006", // Child of "Sort Old Boxes"
    type: "goal",
    canInfluence: true,
    duration: 10,
    deadline: new Date(),
    starts: undefined,
  },
  {
    title: "Move Boxes to Basement",
    id: "008", // Unique id for TaskB
    parentId: "006", // Child of "Sort Old Boxes"
    type: "goal",
    canInfluence: true,
    duration: 12,
    deadline: new Date(),
    starts: undefined,
  },
];
