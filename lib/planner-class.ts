import { v4 as uuidv4 } from "uuid";

export interface PlannerInterface {
  title: string;
  id: string;
  parentId?: string;
  type?: "task" | "plan" | "goal" | null;
  canInfluence: boolean;
  duration?: number;
  deadline?: Date;
  starts?: Date;
}

export class Planner implements PlannerInterface {
  title: string;
  id: string;
  parentId?: string;
  type: "task" | "plan" | "goal" | null;
  canInfluence: boolean;
  duration?: number;
  deadline?: Date;
  starts?: Date;

  constructor(
    title: string,
    parentId?: string,
    type: "task" | "plan" | "goal" | null = null,
    canInfluence: boolean = false,
    duration?: number,
    deadline?: Date
  ) {
    this.title = title;
    this.id = uuidv4(); // Generate a UUID for the instance
    this.parentId = parentId;
    this.type = type;
    this.canInfluence = canInfluence;
    this.duration = duration;
    this.deadline = deadline;
  }
}
