import { v4 as uuidv4 } from "uuid";

export interface PlannerInterface {
  title: string;
  id: string;
  type?: "task" | "plan" | "goal" | null;
  canInfluence: boolean;
  duration?: number;
  deadline?: Date;
  starts?: Date;
  subtasks?: Subtask[] | undefined;
}

export class Planner implements PlannerInterface {
  title: string;
  id: string;
  type: "task" | "plan" | "goal" | null;
  canInfluence: boolean;
  duration?: number;
  deadline?: Date | undefined;
  starts?: Date | undefined;
  subtasks?: Subtask[] | undefined;

  constructor(
    title: string,
    type: "task" | "plan" | "goal" | null = null,
    canInfluence: boolean = false,
    duration?: number,
    deadline?: Date | undefined,
    subtasks?: Subtask[] | undefined
  ) {
    this.title = title;
    this.id = uuidv4(); // Generate a UUID for the instance
    this.type = type;
    this.canInfluence = canInfluence; // Set the value here
    this.duration = duration;
    this.deadline = deadline;
    this.subtasks = subtasks;
  }
}

export interface SubtaskInterface {
  title: string;
  duration: number;
}

export class Subtask implements SubtaskInterface {
  title: string;
  duration: number;

  constructor(title: string, duration: number) {
    this.title = title;
    this.duration = duration;
  }
}
