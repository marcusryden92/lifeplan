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
