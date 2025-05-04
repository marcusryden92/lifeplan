import { v4 as uuidv4 } from "uuid";

export interface PlannerInterface {
  title: string;
  id: string;
  parentId?: string;
  type?: "task" | "plan" | "goal" | null;
  isReady?: boolean;
  duration?: number;
  deadline?: Date;
  starts?: Date;
  dependency?: string;
  completed?: {
    startTime: string;
    endTime: string;
  };
}

export class Planner implements PlannerInterface {
  title: string;
  id: string;
  parentId?: string;
  type?: "task" | "plan" | "goal" | null;
  isReady?: boolean;
  duration?: number;
  deadline?: Date;
  starts?: Date;
  dependency?: string;
  completed?: {
    startTime: string;
    endTime: string;
  };

  constructor(
    title: string,
    id?: string, // Optional id
    parentId?: string,
    type: "task" | "plan" | "goal" | null = null,
    isReady?: boolean,
    duration?: number,
    deadline?: Date,
    dependency?: string
  ) {
    this.title = title;
    this.id = id || uuidv4(); // Generate a UUID if no id is passed
    this.parentId = parentId;
    this.type = type;
    this.isReady = isReady;
    this.duration = duration;
    this.deadline = deadline;
    this.dependency = dependency;
  }
}
