import { Planner } from "@/lib/plannerClass";
import { EventTemplate } from "@/utils/templateBuilderUtils";

export const templateSeed: EventTemplate[] = [
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
    title: "Goal2",
    id: "5ade23ea-1381-4895-8ee3-26aa1713bd8e",
    type: "goal",
    canInfluence: true,
    isReady: true,
  },
  {
    title: "a",
    id: "153a2e33-9448-4ff2-80bf-6268d53c978a",
    parentId: "5ade23ea-1381-4895-8ee3-26aa1713bd8e",
    type: "goal",
    canInfluence: true,
    isReady: false,
    duration: 300,
  },
  {
    title: "b",
    id: "686ee99d-6ef1-413c-baca-ef18289272e8",
    parentId: "5ade23ea-1381-4895-8ee3-26aa1713bd8e",
    type: "goal",
    canInfluence: true,
    isReady: false,
    duration: 300,
    dependency: "153a2e33-9448-4ff2-80bf-6268d53c978a",
  },
  {
    title: "c",
    id: "ccbd65fc-eb32-4ee3-ad43-9d3abe4eb882",
    parentId: "5ade23ea-1381-4895-8ee3-26aa1713bd8e",
    type: "goal",
    canInfluence: true,
    isReady: false,
    duration: 300,
    dependency: "686ee99d-6ef1-413c-baca-ef18289272e8",
  },
  {
    title: "d",
    id: "cd2a2066-c55c-419c-869a-a0105643231e",
    parentId: "5ade23ea-1381-4895-8ee3-26aa1713bd8e",
    type: "goal",
    canInfluence: true,
    isReady: false,
    duration: 300,
    dependency: "ccbd65fc-eb32-4ee3-ad43-9d3abe4eb882",
  },
  {
    title: "e",
    id: "773ae3c8-1cc9-4e75-be5d-9bb4391dba00",
    parentId: "5ade23ea-1381-4895-8ee3-26aa1713bd8e",
    type: "goal",
    canInfluence: true,
    isReady: false,
    duration: 300,
    dependency: "cd2a2066-c55c-419c-869a-a0105643231e",
  },
  {
    title: "f",
    id: "cd1a0c16-26bd-4f75-93d8-e35d91656d89",
    parentId: "5ade23ea-1381-4895-8ee3-26aa1713bd8e",
    type: "goal",
    canInfluence: true,
    isReady: false,
    duration: 300,
    dependency: "773ae3c8-1cc9-4e75-be5d-9bb4391dba00",
  },
  {
    title: "g",
    id: "a82cf595-3677-43df-9f11-348e4693f879",
    parentId: "5ade23ea-1381-4895-8ee3-26aa1713bd8e",
    type: "goal",
    canInfluence: true,
    isReady: false,
    duration: 300,
    dependency: "cd1a0c16-26bd-4f75-93d8-e35d91656d89",
  },
  {
    title: "h",
    id: "44c581f7-bf95-45ba-a226-fc409b2666c2",
    parentId: "5ade23ea-1381-4895-8ee3-26aa1713bd8e",
    type: "goal",
    canInfluence: true,
    isReady: false,
    duration: 300,
    dependency: "a82cf595-3677-43df-9f11-348e4693f879",
  },
  {
    title: "i",
    id: "b296a10b-cf0c-433f-8944-472f670528d3",
    parentId: "5ade23ea-1381-4895-8ee3-26aa1713bd8e",
    type: "goal",
    canInfluence: true,
    isReady: false,
    duration: 300,
    dependency: "44c581f7-bf95-45ba-a226-fc409b2666c2",
  },
  {
    title: "j",
    id: "4e3a0785-f77c-4fa1-893b-9d802de497a4",
    parentId: "5ade23ea-1381-4895-8ee3-26aa1713bd8e",
    type: "goal",
    canInfluence: true,
    isReady: false,
    duration: 300,
    dependency: "b296a10b-cf0c-433f-8944-472f670528d3",
  },
  {
    title: "k",
    id: "32f8ac4c-8cb8-4e51-8a39-cb7027c96ed8",
    parentId: "5ade23ea-1381-4895-8ee3-26aa1713bd8e",
    type: "goal",
    canInfluence: true,
    isReady: false,
    duration: 300,
    dependency: "4e3a0785-f77c-4fa1-893b-9d802de497a4",
  },
  {
    title: "l",
    id: "19cce9a6-7b3a-4d8c-954d-44207d0d50bd",
    parentId: "5ade23ea-1381-4895-8ee3-26aa1713bd8e",
    type: "goal",
    canInfluence: true,
    isReady: false,
    duration: 300,
    dependency: "32f8ac4c-8cb8-4e51-8a39-cb7027c96ed8",
  },
  {
    title: "m",
    id: "c486c7ed-943f-4bdc-bcb7-56a7ce769ab0",
    parentId: "5ade23ea-1381-4895-8ee3-26aa1713bd8e",
    type: "goal",
    canInfluence: true,
    isReady: false,
    duration: 300,
    dependency: "19cce9a6-7b3a-4d8c-954d-44207d0d50bd",
  },
  {
    title: "n",
    id: "09420953-37c0-4755-9efc-e0d285bcff1b",
    parentId: "5ade23ea-1381-4895-8ee3-26aa1713bd8e",
    type: "goal",
    canInfluence: true,
    isReady: false,
    duration: 300,
    dependency: "c486c7ed-943f-4bdc-bcb7-56a7ce769ab0",
  },
];
