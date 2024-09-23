import { Planner } from "@/lib/planner-class";

export function getTaskById(
  taskArray: Planner[],
  id: string
): Planner | undefined {
  return taskArray.find((task) => task.id === id); // Find and return the task with the matching id
}

export function getSubtasksFromId(taskArray: Planner[], id: string) {
  let subtasksArray: Planner[] = [];

  taskArray.forEach((task) => {
    if (task.parentId === id) {
      subtasksArray.push(task);
    }
  });

  return subtasksArray;
}

export const handleDeleteTaskById = (
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  taskId: string
) => {
  setTaskArray(
    (prevTasks) => prevTasks.filter((task) => task.id !== taskId) // Filter out the task with the matching id
  );
};

export const totalSubtaskDuration = (
  id: string,
  taskArray: Planner[]
): number => {
  const subtasks = taskArray.filter((task) => task.parentId === id);

  if (!subtasks) {
    const task = getTaskById(taskArray, id);
    if (!task) return 0;

    return task.duration || 0;
  }

  let totalMinutes = subtasks.reduce((total, subtask) => {
    return total + totalSubtaskDuration(subtask.id, taskArray);
  }, 0);

  totalMinutes += subtasks.reduce(
    (total, subtask) => total + (subtask.duration || 0),
    0
  );

  return totalMinutes; // Return total minutes as a number
};

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
