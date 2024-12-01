import { Planner } from "@/lib/planner-class";

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
      time: "21:00",
    },
    duration: 180, // 3 hours (21:00 to 00:00 next day)
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
    duration: 360, // 6 hours
  },
  {
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
  },
];

export const taskArraySeed: Planner[] = [
  {
    title: "root",
    id: "5b5753b6-9f43-4b73-8cc7-17f5b3232b3a",
    type: "goal",
    canInfluence: true,
  },
  {
    title: "task1",
    id: "23a404a8-8daa-47fa-a243-388ca4a8f175",
    parentId: "5b5753b6-9f43-4b73-8cc7-17f5b3232b3a",
    type: "goal",
    canInfluence: true,
    duration: 1,
  },
  {
    title: "task2",
    id: "da382215-6e65-40df-b63a-cfcd4ff7ea68",
    parentId: "5b5753b6-9f43-4b73-8cc7-17f5b3232b3a",
    type: "goal",
    canInfluence: true,
    duration: 2,
  },
  {
    title: "task2a",
    id: "de322ee3-a0d1-4cc7-bd81-6ac16fabe101",
    parentId: "da382215-6e65-40df-b63a-cfcd4ff7ea68",
    type: "goal",
    canInfluence: true,
    duration: 1,
    dependency: "23a404a8-8daa-47fa-a243-388ca4a8f175",
  },
  {
    title: "task2b",
    id: "52db8862-0fe6-4971-9615-4ef84eb47700",
    parentId: "da382215-6e65-40df-b63a-cfcd4ff7ea68",
    type: "goal",
    canInfluence: true,
    duration: 0,
    dependency: "de322ee3-a0d1-4cc7-bd81-6ac16fabe101",
  },
];

/* export const taskArraySeed: Planner[] = [
  {
    title: "root",
    id: "5b5753b6-9f43-4b73-8cc7-17f5b3232b3a",
    type: "goal",
    canInfluence: true,
  },
  {
    title: "task1",
    id: "23a404a8-8daa-47fa-a243-388ca4a8f175",
    parentId: "5b5753b6-9f43-4b73-8cc7-17f5b3232b3a",
    type: "goal",
    canInfluence: true,
    duration: 1,
  },
  {
    title: "task2",
    id: "da382215-6e65-40df-b63a-cfcd4ff7ea68",
    parentId: "5b5753b6-9f43-4b73-8cc7-17f5b3232b3a",
    type: "goal",
    canInfluence: true,
    duration: 2,
  },
  {
    title: "task3",
    id: "81eeba6d-38bb-4bc4-b2b6-e91816348bbc",
    parentId: "5b5753b6-9f43-4b73-8cc7-17f5b3232b3a",
    type: "goal",
    canInfluence: true,
    duration: 0,
    dependency: "52db8862-0fe6-4971-9615-4ef84eb47700",
  },
  {
    title: "task4",
    id: "13837e8a-bdb2-4f30-9ec8-c8af1de34927",
    parentId: "5b5753b6-9f43-4b73-8cc7-17f5b3232b3a",
    type: "goal",
    canInfluence: true,
    duration: 0,
    dependency: "81eeba6d-38bb-4bc4-b2b6-e91816348bbc",
  },
  {
    title: "task2a",
    id: "de322ee3-a0d1-4cc7-bd81-6ac16fabe101",
    parentId: "da382215-6e65-40df-b63a-cfcd4ff7ea68",
    type: "goal",
    canInfluence: true,
    duration: 1,
    dependency: "23a404a8-8daa-47fa-a243-388ca4a8f175",
  },
  {
    title: "task2b",
    id: "a899e467-f590-4e60-9592-98e6ccb7446e",
    parentId: "da382215-6e65-40df-b63a-cfcd4ff7ea68",
    type: "goal",
    canInfluence: true,
    duration: 1,
  },
  {
    title: "task2c",
    id: "52db8862-0fe6-4971-9615-4ef84eb47700",
    parentId: "da382215-6e65-40df-b63a-cfcd4ff7ea68",
    type: "goal",
    canInfluence: true,
    duration: 0,
    dependency: "d807bd1f-098b-4638-b31f-8380963dc787",
  },
  {
    title: "x",
    id: "3d211c37-3cda-4986-a95a-ac49247aa5b4",
    parentId: "a899e467-f590-4e60-9592-98e6ccb7446e",
    type: "goal",
    canInfluence: true,
    duration: 0,
    dependency: "de322ee3-a0d1-4cc7-bd81-6ac16fabe101",
  },
  {
    title: "y",
    id: "ca5ce814-4169-4e38-99ef-3a23cb8867d8",
    parentId: "a899e467-f590-4e60-9592-98e6ccb7446e",
    type: "goal",
    canInfluence: true,
    duration: 0,
    dependency: "3d211c37-3cda-4986-a95a-ac49247aa5b4",
  },
  {
    title: "z",
    id: "d807bd1f-098b-4638-b31f-8380963dc787",
    parentId: "a899e467-f590-4e60-9592-98e6ccb7446e",
    type: "goal",
    canInfluence: true,
    duration: 0,
    dependency: "ca5ce814-4169-4e38-99ef-3a23cb8867d8",
  },
];
 */
