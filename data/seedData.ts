import { Planner } from "@/lib/plannerClass";

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
    title: "GOAL1",
    id: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    isReady: true,
  },
  {
    title: "A",
    id: "897e1dfb-9ca9-4002-9b64-1a7ce052e3b2",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
  },
  {
    title: "B",
    id: "277c8a4c-2822-46b4-b728-0a82c4fb6942",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "897e1dfb-9ca9-4002-9b64-1a7ce052e3b2",
  },
  {
    title: "C",
    id: "62512456-d569-4a03-bda5-09a091d79f28",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "277c8a4c-2822-46b4-b728-0a82c4fb6942",
  },
  {
    title: "D",
    id: "00ab8e6b-4e73-4c2b-b345-4b0c8f7790a6",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "62512456-d569-4a03-bda5-09a091d79f28",
  },
  {
    title: "E",
    id: "7dfcaabd-27a9-4412-8e60-adca59ede7b2",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "00ab8e6b-4e73-4c2b-b345-4b0c8f7790a6",
  },
  {
    title: "F",
    id: "3f087350-fc21-401b-b1ab-6143bee1480c",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "7dfcaabd-27a9-4412-8e60-adca59ede7b2",
  },
  {
    title: "G",
    id: "5d40b505-2c2b-428e-acab-44f03d91fd82",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "3f087350-fc21-401b-b1ab-6143bee1480c",
  },
  {
    title: "H",
    id: "c247ca4b-53fd-4180-a779-fa22b135b976",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "5d40b505-2c2b-428e-acab-44f03d91fd82",
  },
  {
    title: "I",
    id: "b97c7c4d-2585-45f7-9c06-3a6294201b4b",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "c247ca4b-53fd-4180-a779-fa22b135b976",
  },
  {
    title: "J",
    id: "35597a55-5d85-4058-9985-4d38c70a064c",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "b97c7c4d-2585-45f7-9c06-3a6294201b4b",
  },
  {
    title: "K",
    id: "6f24591d-0827-4b88-b09f-141ec3838ff4",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "35597a55-5d85-4058-9985-4d38c70a064c",
  },
  {
    title: "L",
    id: "910dfd6b-c0ca-4f69-93f9-84b51db087c6",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "6f24591d-0827-4b88-b09f-141ec3838ff4",
  },
  {
    title: "M",
    id: "3774b86d-498d-429e-bd10-f4631f678be4",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "910dfd6b-c0ca-4f69-93f9-84b51db087c6",
  },
  {
    title: "N",
    id: "623ad347-115d-4f1d-b4cf-93594e05592f",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "3774b86d-498d-429e-bd10-f4631f678be4",
  },
  {
    title: "O",
    id: "9bd9d07b-7539-4517-99c7-60d344e622bb",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "623ad347-115d-4f1d-b4cf-93594e05592f",
  },
  {
    title: "P",
    id: "9cbda1ba-1c78-4661-8972-c4cc57d5be01",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "9bd9d07b-7539-4517-99c7-60d344e622bb",
  },
  {
    title: "Q",
    id: "0dbb38ab-f3dd-45ce-9b30-49c5a5f94d93",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "9cbda1ba-1c78-4661-8972-c4cc57d5be01",
  },
  {
    title: "R",
    id: "d955da84-721b-48b7-80c9-589cd42483fb",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "0dbb38ab-f3dd-45ce-9b30-49c5a5f94d93",
  },
  {
    title: "S",
    id: "54ec997f-3117-4fda-a87d-1e07542a4347",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "d955da84-721b-48b7-80c9-589cd42483fb",
  },
  {
    title: "T",
    id: "da737de3-0f8a-4e21-af3d-84ef38bdb5ce",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "54ec997f-3117-4fda-a87d-1e07542a4347",
  },
  {
    title: "U",
    id: "ea9f7523-ceba-42e5-967f-676a96b0da63",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "da737de3-0f8a-4e21-af3d-84ef38bdb5ce",
  },
  {
    title: "V",
    id: "06b53fb9-b06b-4ccc-8d63-40ac0202d2e2",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "ea9f7523-ceba-42e5-967f-676a96b0da63",
  },
  {
    title: "X",
    id: "6a460d49-31c8-4b95-9cdc-62d054ee2ca6",
    parentId: "35c0e455-316a-4028-83ba-a45837a22617",
    type: "goal",
    canInfluence: true,
    duration: 60,
    dependency: "06b53fb9-b06b-4ccc-8d63-40ac0202d2e2",
  },
];
