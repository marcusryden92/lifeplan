export interface PlannerInterface {
  title: string;
  type?: "task" | "plan" | "goal" | "inactive" | null;
  duration?: number;
  deadline?: Date;
}

export class Planner implements PlannerInterface {
  title: string;
  type: "task" | "plan" | "goal" | "inactive" | null; // No need for ?
  duration?: number;
  deadline?: Date;

  constructor(
    title: string,
    type: "task" | "plan" | "goal" | "inactive" | null = null, // Default value for type
    duration?: number,
    deadline?: Date
  ) {
    this.title = title;
    this.type = type;
    this.duration = duration;
    this.deadline = deadline;
  }

  setDeadline(newDeadline: Date): void {
    this.deadline = newDeadline;
  }
}
