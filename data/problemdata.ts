import { Planner } from "@/lib/planner-class";

export const planner1: Planner[] = [
  {
    title: "root",
    id: "5b5753b6-9f43-4b73-8cc7-17f5b3232b3a",
    type: "goal",
    canInfluence: true,
  },
  {
    title: "task2b",
    id: "a899e467-f590-4e60-9592-98e6ccb7446e",
    parentId: "5b5753b6-9f43-4b73-8cc7-17f5b3232b3a",
    type: "goal",
    canInfluence: true,
    duration: 1,
  },
  {
    title: "task2c",
    id: "52db8862-0fe6-4971-9615-4ef84eb47700",
    parentId: "a899e467-f590-4e60-9592-98e6ccb7446e",
    type: "goal",
    canInfluence: true,
    duration: 0,
  },
  {
    title: "z",
    id: "d807bd1f-098b-4638-b31f-8380963dc787",
    parentId: "52db8862-0fe6-4971-9615-4ef84eb47700",
    type: "goal",
    canInfluence: true,
    duration: 0,
    dependency: "ca5ce814-4169-4e38-99ef-3a23cb8867d8",
  },
  {
    title: "y",
    id: "ca5ce814-4169-4e38-99ef-3a23cb8867d8",
    parentId: "3d211c37-3cda-4986-a95a-ac49247aa5b4",
    type: "goal",
    canInfluence: true,
    duration: 0,
  },
  {
    title: "task2",
    id: "da382215-6e65-40df-b63a-cfcd4ff7ea68",
    parentId: "52db8862-0fe6-4971-9615-4ef84eb47700",
    type: "goal",
    canInfluence: true,
    duration: 2,
  },
  {
    title: "task1",
    id: "23a404a8-8daa-47fa-a243-388ca4a8f175",
    parentId: "da382215-6e65-40df-b63a-cfcd4ff7ea68",
    type: "goal",
    canInfluence: true,
    duration: 1,
  },
  {
    title: "x",
    id: "3d211c37-3cda-4986-a95a-ac49247aa5b4",
    parentId: "23a404a8-8daa-47fa-a243-388ca4a8f175",
    type: "goal",
    canInfluence: true,
    duration: 0,
  },
  {
    title: "task2a",
    id: "de322ee3-a0d1-4cc7-bd81-6ac16fabe101",
    parentId: "3d211c37-3cda-4986-a95a-ac49247aa5b4",
    type: "goal",
    canInfluence: true,
    duration: 1,
    dependency: "ca5ce814-4169-4e38-99ef-3a23cb8867d8",
  },
];

// Move-to-middle
// Moved: x
// Target: 2c
