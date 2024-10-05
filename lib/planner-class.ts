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
  dependencies?: string[];
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
  dependencies?: string[];

  constructor(
    title: string,
    parentId?: string,
    type: "task" | "plan" | "goal" | null = null,
    canInfluence: boolean = false,
    duration?: number,
    deadline?: Date,
    dependencies?: string[]
  ) {
    this.title = title;
    this.id = uuidv4(); // Generate a UUID for the instance
    this.parentId = parentId;
    this.type = type;
    this.canInfluence = canInfluence;
    this.duration = duration;
    this.deadline = deadline;
    this.dependencies = dependencies;
  }
}
