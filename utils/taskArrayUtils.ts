import { Planner } from "@/types/prisma";
import { getSubtasksById } from "./goalPageHandlers";

export function getTaskById(
  planner: Planner[],
  id: string
): Planner | undefined {
  return planner.find((task) => task.id === id); // Find and return the task with the matching id
}

export const handleDeleteTaskById = (
  updatePlannerArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  taskId: string
) => {
  updatePlannerArray(
    (prevTasks) => prevTasks.filter((task) => task.id !== taskId) // Filter out the task with the matching id
  );
};

export function totalSubtaskDuration(id: string, planner: Planner[]): number {
  // console.log(`Calculating duration for task ID: ${id}`);

  const task = planner.find((t) => t.id === id);

  if (!task) {
    // console.log(`Task not found for ID: ${id}`);
    return 0; // Task not found
  }

  const subtasks = getSubtasksById(planner, id); // Returns an array of Planner objects
  // console.log(`Subtasks found for ID ${id}:`, subtasks);

  // If the task has no subtasks, return its duration if it's a goal
  if (subtasks.length === 0) {
    // console.log(`Returning duration for task ID ${id}:`, task.duration || 0);
    return task.duration || 0; // Return duration only for bottom-level goals
  }

  let totalDuration = 0; // Initialize total duration

  // Loop through each subtask and accumulate their durations
  for (const subtask of subtasks) {
    const subtaskDuration = totalSubtaskDuration(subtask.id, planner); // Get the duration of each subtask
    // console.log(`Subtask ID: ${subtask.id} has duration: ${subtaskDuration}`);
    totalDuration += subtaskDuration; // Add the duration of each subtask
  }

  // console.log(`Total duration for task ID ${id}:`, totalDuration); // Log total duration
  return totalDuration; // Return the accumulated total duration
}

export const formatMinutesToHours = (totalMinutes: number): string => {
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
};
