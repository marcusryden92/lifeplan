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
    id: "695438a7-61e3-4622-b450-05a9af1fe5d3",
    type: "goal",
    canInfluence: true,
  },
  {
    title: "task1",
    id: "aee71b47-a258-4dd5-9dad-820eb65552af",
    parentId: "695438a7-61e3-4622-b450-05a9af1fe5d3",
    type: "goal",
    canInfluence: true,
    duration: 5,
  },
  {
    title: "task2",
    id: "d75e7fc3-53b6-4725-94fb-8a2f578c9e61",
    parentId: "695438a7-61e3-4622-b450-05a9af1fe5d3",
    type: "goal",
    canInfluence: true,
    duration: 5,
  },
  {
    title: "task1a",
    id: "52019383-7ee5-42aa-a02a-48de04620593",
    parentId: "aee71b47-a258-4dd5-9dad-820eb65552af",
    type: "goal",
    canInfluence: true,
    duration: 5,
  },
  {
    title: "task1b",
    id: "8d247f40-581e-4f76-9a13-dedb84070119",
    parentId: "aee71b47-a258-4dd5-9dad-820eb65552af",
    type: "goal",
    canInfluence: true,
    duration: 5,
  },
  {
    title: "task1c",
    id: "304f112a-ea06-4a7f-9013-0decbaf136dd",
    parentId: "aee71b47-a258-4dd5-9dad-820eb65552af",
    type: "goal",
    canInfluence: true,
    duration: 5,
  },
  {
    title: "task2a",
    id: "635b2dba-5f4e-4288-8bf8-892e61aa6e9b",
    parentId: "d75e7fc3-53b6-4725-94fb-8a2f578c9e61",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "579af0ea-ce5d-4818-ae58-30f84953875d",
  },
  {
    title: "task2b",
    id: "e811e7d7-7701-4d3b-925e-edd79bb79d5b",
    parentId: "d75e7fc3-53b6-4725-94fb-8a2f578c9e61",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "635b2dba-5f4e-4288-8bf8-892e61aa6e9b",
  },
  {
    title: "task2c",
    id: "abf82475-a15b-4f6b-8d5c-b26f1421412b",
    parentId: "d75e7fc3-53b6-4725-94fb-8a2f578c9e61",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "e811e7d7-7701-4d3b-925e-edd79bb79d5b",
  },
  {
    title: "x",
    id: "323f09cd-0001-4431-a19e-9f5e66ecb58d",
    parentId: "52019383-7ee5-42aa-a02a-48de04620593",
    type: "goal",
    canInfluence: true,
    duration: 5,
  },
  {
    title: "y",
    id: "434ea945-8031-418f-8cb2-241ed8440a0e",
    parentId: "52019383-7ee5-42aa-a02a-48de04620593",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "323f09cd-0001-4431-a19e-9f5e66ecb58d",
  },
  {
    title: "x",
    id: "86d94c03-23f1-4d88-819c-39915ebf739f",
    parentId: "8d247f40-581e-4f76-9a13-dedb84070119",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "434ea945-8031-418f-8cb2-241ed8440a0e",
  },
  {
    title: "y",
    id: "421e967a-b097-43f3-8164-8d6115dadf4d",
    parentId: "8d247f40-581e-4f76-9a13-dedb84070119",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "86d94c03-23f1-4d88-819c-39915ebf739f",
  },
  {
    title: "x",
    id: "2ddd9fc1-e61d-45ba-9b84-f76aa95583a9",
    parentId: "304f112a-ea06-4a7f-9013-0decbaf136dd",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "421e967a-b097-43f3-8164-8d6115dadf4d",
  },
  {
    title: "y",
    id: "579af0ea-ce5d-4818-ae58-30f84953875d",
    parentId: "304f112a-ea06-4a7f-9013-0decbaf136dd",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "2ddd9fc1-e61d-45ba-9b84-f76aa95583a9",
  },
];

export const taskArraySeed2: Planner[] = [
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
