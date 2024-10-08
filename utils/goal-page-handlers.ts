import { Planner } from "@/lib/planner-class";

// GET GOAL SUBTASKS FROM GOAL ID

export function getSubtasksFromId(taskArray: Planner[], id: string): Planner[] {
  const subtasks = taskArray.filter((task) => task.parentId === id);
  return subtasks;
}

// SORT TASKS BY DEPENDENCIES

export function sortTasksByDependencies(tasks: Planner[]): Planner[] {
  // Arrays to hold different categories of tasks
  const independentTasks: Planner[] = [];
  const rootTasks: Planner[] = [];
  const standAloneTasks: Planner[] = [];
  const sortedArray: Planner[] = [];

  // Categorize tasks into independent, root, and stand-alone tasks
  tasks.forEach((task) => {
    if (!task.dependencies || task.dependencies.length === 0) {
      independentTasks.push(task);
    }
  });

  independentTasks.forEach((task) => {
    const hasDependents = tasks.some((otherTask) =>
      otherTask.dependencies?.includes(task.id)
    );

    if (hasDependents) {
      rootTasks.push(task);
    } else {
      standAloneTasks.push(task);
    }
  });

  // Function to recursively add a task and its dependents to the sorted array
  const addTaskWithDependents = (task: Planner) => {
    sortedArray.push(task); // Add the parent task

    // Find and add dependent tasks
    const dependentTasks = tasks.filter((otherTask) =>
      otherTask.dependencies?.includes(task.id)
    );

    dependentTasks.forEach(addTaskWithDependents); // Recursively add each dependent
  };

  // Add all root tasks and their dependents to the sorted array
  rootTasks.forEach(addTaskWithDependents);

  // Add stand-alone tasks to the sorted array
  sortedArray.push(...standAloneTasks);

  return sortedArray;
}

export function getTreeBottomLayer(
  taskArray: Planner[],
  id: string
): Planner[] {
  const subtasks: Planner[] = taskArray.filter((task) => task.parentId === id);

  if (subtasks.length === 0) return taskArray.filter((task) => task.id === id);

  return subtasks.reduce((bottomLayer: Planner[], task: Planner) => {
    return [...bottomLayer, ...getTreeBottomLayer(taskArray, task.id)];
  }, []);
}

// Get the correct dependency when creating a new subtask in a goal
export function getDependency(
  taskArray: Planner[],
  parentId: string | undefined
): string | undefined {
  // Return undefined if no parent ID is provided
  if (!parentId) return undefined;

  // Get the bottom layer of tasks for the given parent ID
  const bottomLayer = getTreeBottomLayer(taskArray, parentId);

  // If the bottom layer is found and contains tasks, return the ID of the last one
  if (bottomLayer && bottomLayer.length > 0) {
    const sortedArray = sortTasksByDependencies(bottomLayer);
    return sortedArray[sortedArray.length - 1]?.id; // Use optional chaining for safety
  }

  // If no bottom layer is found, check the parent task
  const task = taskArray.find((task) => task.id === parentId);

  // If the parent task exists, recursively get its dependency
  if (task) {
    return getDependency(taskArray, task.parentId); // Recursively call with the parent's ID
  }

  return undefined; // Return undefined if no valid dependency is found
}
