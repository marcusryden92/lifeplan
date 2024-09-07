export interface PlannerInterface {
  title: string;
  type?: "task" | "plan" | "goal" | null;
  canInfluence: boolean;
  duration?: number;
  deadline?: Date;
  starts?: Date;
  subtasks?: Subtask[] | undefined;
}

export class Planner implements PlannerInterface {
  title: string;
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
    deadline?: Date | undefined
  ) {
    this.title = title;
    this.type = type;
    this.canInfluence = canInfluence; // Set the value here
    this.duration = duration;
    this.deadline = deadline;
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
