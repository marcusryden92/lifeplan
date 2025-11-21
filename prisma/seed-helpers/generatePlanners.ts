import { Planner } from "../generated/client";

/**
 * Simplified planner data structure - only specify the essential fields.
 * The generator function will fill in the rest with sensible defaults.
 */
export interface SimplePlannerData {
  id: string;
  title: string;
  parentId: string | null;
  duration: number;
  color: string;
  dependency?: string | null;
}

/**
 * Seed data for planner goals organized in hierarchical structures.
 * Three main goal hierarchies: A, B, and C with their respective subgoals.
 */
export const plannerSeedData: SimplePlannerData[] = [
  // Goal A hierarchy
  {
    id: "a2d8280b-0362-4fc1-8947-4db30233e47a",
    title: "A",
    parentId: null,
    duration: 5,
    color: "#6C5CE7",
  },
  {
    id: "414c5e8d-2e48-44c5-911d-df2522da1465",
    title: "A",
    parentId: "a2d8280b-0362-4fc1-8947-4db30233e47a",
    duration: 15,
    color: "#6C5CE7",
  },
  {
    id: "5d3d674c-5bc0-45b0-8bce-d01a30d81522",
    title: "A1",
    parentId: "414c5e8d-2e48-44c5-911d-df2522da1465",
    duration: 45,
    color: "#6C5CE7",
  },
  {
    id: "ded9475d-4b1b-433e-96d2-76b987654cb2",
    title: "A2",
    parentId: "414c5e8d-2e48-44c5-911d-df2522da1465",
    duration: 45,
    color: "#6C5CE7",
    dependency: "5d3d674c-5bc0-45b0-8bce-d01a30d81522",
  },
  {
    id: "da47b873-4a31-4671-b729-5748ce070d22",
    title: "A3",
    parentId: "414c5e8d-2e48-44c5-911d-df2522da1465",
    duration: 45,
    color: "#6C5CE7",
    dependency: "ded9475d-4b1b-433e-96d2-76b987654cb2",
  },
  {
    id: "ef08d5bb-54aa-4403-8783-47f5ba65e8ac",
    title: "A4",
    parentId: "414c5e8d-2e48-44c5-911d-df2522da1465",
    duration: 15,
    color: "#6C5CE7",
    dependency: "da47b873-4a31-4671-b729-5748ce070d22",
  },
  {
    id: "c123a380-1303-415b-849f-6211fac04001",
    title: "A5",
    parentId: "414c5e8d-2e48-44c5-911d-df2522da1465",
    duration: 30,
    color: "#6C5CE7",
    dependency: "ef08d5bb-54aa-4403-8783-47f5ba65e8ac",
  },
  {
    id: "3ac9edae-5a09-49be-ac16-940a05047a18",
    title: "A6",
    parentId: "414c5e8d-2e48-44c5-911d-df2522da1465",
    duration: 15,
    color: "#6C5CE7",
    dependency: "c123a380-1303-415b-849f-6211fac04001",
  },
  {
    id: "d0bc9d33-3acd-429b-99ec-9993f44e9741",
    title: "A7",
    parentId: "414c5e8d-2e48-44c5-911d-df2522da1465",
    duration: 60,
    color: "#6C5CE7",
    dependency: "3ac9edae-5a09-49be-ac16-940a05047a18",
  },

  // Goal B hierarchy
  {
    id: "b202e2a8-bfe2-4b10-8a18-91f7e32173f8",
    title: "B",
    parentId: null,
    duration: 5,
    color: "#8E44AD",
  },
  {
    id: "7f8665a1-a476-412f-83ad-71fd21158372",
    title: "B1",
    parentId: "b202e2a8-bfe2-4b10-8a18-91f7e32173f8",
    duration: 15,
    color: "#8E44AD",
  },
  {
    id: "13878697-4a27-4e18-bb0b-bf99dfad3e4c",
    title: "B2",
    parentId: "b202e2a8-bfe2-4b10-8a18-91f7e32173f8",
    duration: 15,
    color: "#8E44AD",
    dependency: "7f8665a1-a476-412f-83ad-71fd21158372",
  },
  {
    id: "9adc0a2f-5505-4334-9e5a-dae3e744bdd4",
    title: "B3",
    parentId: "b202e2a8-bfe2-4b10-8a18-91f7e32173f8",
    duration: 45,
    color: "#8E44AD",
    dependency: "13878697-4a27-4e18-bb0b-bf99dfad3e4c",
  },
  {
    id: "d9abc068-181b-4e32-a97b-362ee85bfcb6",
    title: "B4",
    parentId: "b202e2a8-bfe2-4b10-8a18-91f7e32173f8",
    duration: 100,
    color: "#8E44AD",
    dependency: "9adc0a2f-5505-4334-9e5a-dae3e744bdd4",
  },
  {
    id: "e53e6d6a-c5da-4621-8165-da7f1102b5c8",
    title: "B5",
    parentId: "b202e2a8-bfe2-4b10-8a18-91f7e32173f8",
    duration: 50,
    color: "#8E44AD",
    dependency: "d9abc068-181b-4e32-a97b-362ee85bfcb6",
  },
  {
    id: "e908862a-8b2a-4b06-9f5f-b2695101994e",
    title: "B6",
    parentId: "b202e2a8-bfe2-4b10-8a18-91f7e32173f8",
    duration: 30,
    color: "#8E44AD",
    dependency: "e53e6d6a-c5da-4621-8165-da7f1102b5c8",
  },
  {
    id: "d696ed65-01a7-437a-9b67-1e5076e52e30",
    title: "B7",
    parentId: "b202e2a8-bfe2-4b10-8a18-91f7e32173f8",
    duration: 45,
    color: "#8E44AD",
    dependency: "e908862a-8b2a-4b06-9f5f-b2695101994e",
  },

  // Goal C hierarchy
  {
    id: "13e0b5e3-e92f-4529-871b-b0de9d81a094",
    title: "C",
    parentId: null,
    duration: 5,
    color: "#457B9D",
  },
  {
    id: "0fcae948-e489-44ed-92fc-cd03a42e2f5f",
    title: "C1",
    parentId: "13e0b5e3-e92f-4529-871b-b0de9d81a094",
    duration: 30,
    color: "#457B9D",
  },
  {
    id: "9403a111-3d02-470a-a930-4baf95097bfd",
    title: "C2",
    parentId: "13e0b5e3-e92f-4529-871b-b0de9d81a094",
    duration: 45,
    color: "#457B9D",
    dependency: "0fcae948-e489-44ed-92fc-cd03a42e2f5f",
  },
  {
    id: "6a68c08b-b2ed-4c0a-a927-7f7d14bfa8f8",
    title: "C3",
    parentId: "13e0b5e3-e92f-4529-871b-b0de9d81a094",
    duration: 55,
    color: "#457B9D",
    dependency: "9403a111-3d02-470a-a930-4baf95097bfd",
  },
  {
    id: "0a1101c5-d1d1-426c-b53e-4c0a31cb6168",
    title: "C4",
    parentId: "13e0b5e3-e92f-4529-871b-b0de9d81a094",
    duration: 20,
    color: "#457B9D",
    dependency: "6a68c08b-b2ed-4c0a-a927-7f7d14bfa8f8",
  },
  {
    id: "333e37fd-55c9-44f2-8947-107d01980b65",
    title: "C5",
    parentId: "13e0b5e3-e92f-4529-871b-b0de9d81a094",
    duration: 20,
    color: "#457B9D",
    dependency: "0a1101c5-d1d1-426c-b53e-4c0a31cb6168",
  },
  {
    id: "d85763b6-175a-4841-90d4-2ce14eb58d9e",
    title: "C6",
    parentId: "13e0b5e3-e92f-4529-871b-b0de9d81a094",
    duration: 60,
    color: "#457B9D",
    dependency: "333e37fd-55c9-44f2-8947-107d01980b65",
  },
];

/**
 * Generates full Planner objects from simplified seed data.
 * This centralizes the planner creation logic, so changes to the Planner model
 * only need to be updated here.
 */
export const generatePlanners = (userId: string): Planner[] => {
  const timestamp = new Date().toISOString();

  return plannerSeedData.map((data) => ({
    id: data.id,
    title: data.title,
    parentId: data.parentId,
    itemType: "goal" as const,
    isReady: true,
    duration: data.duration,
    deadline: null,
    starts: null,
    dependency: data.dependency ?? null,
    completedStartTime: null,
    completedEndTime: null,
    priority: 5,
    userId,
    color: data.color,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
};
