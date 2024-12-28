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
    title: "task1a",
    id: "36dbb5d6-b7e1-4e77-a68a-d441c8c10871",
    parentId: "23a404a8-8daa-47fa-a243-388ca4a8f175",
    type: "goal",
    canInfluence: true,
    duration: 5,
  },
  {
    title: "task1b",
    id: "721ec7c4-8815-4caf-a902-52ce61aa2d9c",
    parentId: "23a404a8-8daa-47fa-a243-388ca4a8f175",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "36dbb5d6-b7e1-4e77-a68a-d441c8c10871",
  },
  {
    title: "task1c",
    id: "511ccb3d-5b56-4b71-829c-bffed3fe1ede",
    parentId: "23a404a8-8daa-47fa-a243-388ca4a8f175",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "721ec7c4-8815-4caf-a902-52ce61aa2d9c",
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

export const taskArraySeed3: Planner[] = [
  {
    title: "root",
    id: "5b5753b6-9f43-4b73-8cc7-17f5b3232b3a",
    type: "goal",
    canInfluence: true,
  },
  {
    title: "task1",
    id: "da382215-6e65-40df-b63a-cfcd4ff7ea68",
    parentId: "5b5753b6-9f43-4b73-8cc7-17f5b3232b3a",
    type: "goal",
    canInfluence: true,
    duration: 2,
  },
  {
    title: "task1a",
    id: "de322ee3-a0d1-4cc7-bd81-6ac16fabe101",
    parentId: "da382215-6e65-40df-b63a-cfcd4ff7ea68",
    type: "goal",
    canInfluence: true,
    duration: 1,
  },
  {
    title: "task1b",
    id: "a899e467-f590-4e60-9592-98e6ccb7446e",
    parentId: "de322ee3-a0d1-4cc7-bd81-6ac16fabe101",
    type: "goal",
    canInfluence: true,
    duration: 1,
  },
  {
    title: "task1c",
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

export const taskArraySeed4: Planner[] = [
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
    title: "1a",
    id: "ae9b7f81-4c34-4e86-a96f-9701482327a3",
    parentId: "23a404a8-8daa-47fa-a243-388ca4a8f175",
    type: "goal",
    canInfluence: true,
    duration: 5,
  },
  {
    title: "x",
    id: "219fff23-17ed-4826-893b-aa5cf7c388aa",
    parentId: "ae9b7f81-4c34-4e86-a96f-9701482327a3",
    type: "goal",
    canInfluence: true,
    duration: 5,
  },
  {
    title: "y",
    id: "0f271348-4498-42bb-8083-b7cd487112fe",
    parentId: "ae9b7f81-4c34-4e86-a96f-9701482327a3",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "219fff23-17ed-4826-893b-aa5cf7c388aa",
  },
  {
    title: "z",
    id: "6acda1fa-20f2-4217-9528-4573ba817647",
    parentId: "ae9b7f81-4c34-4e86-a96f-9701482327a3",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "0f271348-4498-42bb-8083-b7cd487112fe",
  },
  {
    title: "task2",
    id: "359e4c6e-18ee-4fb1-997d-ef94d1c11503",
    parentId: "5b5753b6-9f43-4b73-8cc7-17f5b3232b3a",
    type: "goal",
    canInfluence: true,
    duration: 5,
  },
  {
    title: "2a",
    id: "8966c19f-54d8-4841-9e0b-34828892da5b",
    parentId: "359e4c6e-18ee-4fb1-997d-ef94d1c11503",
    type: "goal",
    canInfluence: true,
    duration: 5,
  },
  {
    title: "2b",
    id: "81d120a3-69fa-4601-b535-3c04b5c99a63",
    parentId: "359e4c6e-18ee-4fb1-997d-ef94d1c11503",
    type: "goal",
    canInfluence: true,
    duration: 5,
  },
  {
    title: "2c",
    id: "f78c4d53-00af-49c1-95eb-204bf1d103b2",
    parentId: "359e4c6e-18ee-4fb1-997d-ef94d1c11503",
    type: "goal",
    canInfluence: true,
    duration: 5,
  },
  {
    title: "2d",
    id: "03f631f3-ea59-4a18-83fa-66f7c0f21626",
    parentId: "359e4c6e-18ee-4fb1-997d-ef94d1c11503",
    type: "goal",
    canInfluence: true,
    duration: 5,
  },
  {
    title: "x",
    id: "0e2abd35-71f9-4631-bb06-2a4b07796d98",
    parentId: "8966c19f-54d8-4841-9e0b-34828892da5b",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "6acda1fa-20f2-4217-9528-4573ba817647",
  },
  {
    title: "y",
    id: "6da4e62f-42e9-4d1f-ade9-82524166d500",
    parentId: "8966c19f-54d8-4841-9e0b-34828892da5b",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "0e2abd35-71f9-4631-bb06-2a4b07796d98",
  },
  {
    title: "z",
    id: "324f5c0a-d5b3-40e7-a01d-06abc9eaee9f",
    parentId: "8966c19f-54d8-4841-9e0b-34828892da5b",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "6da4e62f-42e9-4d1f-ade9-82524166d500",
  },
  {
    title: "x",
    id: "4e897bf2-3ed3-4d12-bd60-1731228b6b23",
    parentId: "81d120a3-69fa-4601-b535-3c04b5c99a63",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "324f5c0a-d5b3-40e7-a01d-06abc9eaee9f",
  },
  {
    title: "y",
    id: "2b7dabf2-9e7d-4804-b8f2-48188a438f5c",
    parentId: "81d120a3-69fa-4601-b535-3c04b5c99a63",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "4e897bf2-3ed3-4d12-bd60-1731228b6b23",
  },
  {
    title: "z",
    id: "f2e4221d-6800-4aba-bc37-b828ab3764ec",
    parentId: "81d120a3-69fa-4601-b535-3c04b5c99a63",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "2b7dabf2-9e7d-4804-b8f2-48188a438f5c",
  },
  {
    title: "å",
    id: "5743a0dc-ee27-4e2e-b2a8-b0183767b3c3",
    parentId: "f78c4d53-00af-49c1-95eb-204bf1d103b2",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "f2e4221d-6800-4aba-bc37-b828ab3764ec",
  },
  {
    title: "ä",
    id: "be1052ec-58a1-46d1-83f0-2a5cef3bdfd5",
    parentId: "f78c4d53-00af-49c1-95eb-204bf1d103b2",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "5743a0dc-ee27-4e2e-b2a8-b0183767b3c3",
  },
  {
    title: "ö",
    id: "db08931c-5b68-4193-9bec-84c4e041036b",
    parentId: "f78c4d53-00af-49c1-95eb-204bf1d103b2",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "be1052ec-58a1-46d1-83f0-2a5cef3bdfd5",
  },
  {
    title: "i",
    id: "5f45ae4d-c599-4605-9c5e-bdcef49bee5b",
    parentId: "03f631f3-ea59-4a18-83fa-66f7c0f21626",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "db08931c-5b68-4193-9bec-84c4e041036b",
  },
  {
    title: "ii",
    id: "fb7d2e9b-eb39-4a49-ad63-93338613dd54",
    parentId: "03f631f3-ea59-4a18-83fa-66f7c0f21626",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "5f45ae4d-c599-4605-9c5e-bdcef49bee5b",
  },
  {
    title: "iii",
    id: "24b6a64c-0943-467e-903c-f7f4806f862e",
    parentId: "03f631f3-ea59-4a18-83fa-66f7c0f21626",
    type: "goal",
    canInfluence: true,
    duration: 5,
    dependency: "fb7d2e9b-eb39-4a49-ad63-93338613dd54",
  },
];
