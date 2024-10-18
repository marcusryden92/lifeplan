import { Planner } from "@/lib/planner-class";
import { v4 as uuidv4 } from "uuid";

interface AddSubtaskInterface {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  parentId: string;
  taskDuration: number;
  taskTitle: string;
  resetTaskState: () => void;
}

export function addSubtask({
  taskArray,
  setTaskArray,
  parentId,
  taskDuration,
  taskTitle,
  resetTaskState,
}: AddSubtaskInterface) {
  const newId = uuidv4();

  if (taskDuration !== undefined && taskTitle) {
    const newTask = new Planner(
      taskTitle,
      newId,
      parentId, // Using parentId here
      "goal",
      true,
      taskDuration,
      undefined
    );

    setTaskArray((prevTasks) => [...prevTasks, newTask]); // Spread prevTasks and add newTask

    resetTaskState();
  }

  setNewDependencies(taskArray, setTaskArray, parentId, newId);
}

// Get the correct dependency when creating a new subtask in a goal
export function setNewDependencies(
  taskArray: Planner[],
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  parentId: string,
  newId: string,
  lastId?: string
) {
  // Get potential siblings
  const siblings: Planner[] = taskArray.filter(
    (task) => task.parentId === parentId
  );

  // Check if the task is the first task of the first layer (the next one after root later), and if so return undefined
  const parentTask = taskArray.find((task) => task.id === parentId);

  if (parentTask && !parentTask.parentId && siblings.length === 0) return;

  // Get the ID of the root task/goal
  const rootParentId = getRootParent(taskArray, parentId);

  if (!rootParentId) {
    return;
  }

  if (siblings && siblings.length > 0) {
    // Order siblings
    const sortedSiblings = sortTasksByDependencies(siblings, taskArray);

    // Get last item in array
    const lastSiblingItem = sortedSiblings[sortedSiblings.length - 1];

    // Get the whole bottom layer (actionable items) from this item
    const bottomLayer = getTreeBottomLayer(taskArray, lastSiblingItem.id);

    const lastBottomLayerItem = bottomLayer[bottomLayer.length - 1];

    // If a task exists in the bottom layer, which carries the ID of lastSiblingItem as its dependency, swap it for newId
    setTaskArray((prev) =>
      prev.map((task) => {
        if (task.dependency === lastBottomLayerItem.id) {
          // Replace lastSiblingItem.id with newId in dependenciesS
          return { ...task, dependency: newId };
        }
        return task; // Return the unchanged task if no dependency matches
      })
    );

    // Set the last item ID in the dependency array of the new task (with newId)
    setTaskArray((prev) =>
      prev.map((task) => {
        if (task.id === newId) {
          return { ...task, dependency: lastBottomLayerItem.id }; // Add lastItem.id as a dependency for the new task
        }
        return task;
      })
    );
  }

  if (!siblings || siblings.length === 0) {
    // Check if the parentId is dependent on anything

    const parentTask = taskArray.find((task) => task.id === parentId);
    const parentDependency = parentTask?.dependency;

    setTaskArray((prev) =>
      prev.map((task) => {
        if (
          task.id === parentId &&
          task.dependency &&
          task.dependency?.length > 0
        ) {
          return { ...task, dependency: undefined };
        }

        if (task.id === newId) {
          return { ...task, dependency: parentDependency };
        }
        return task;
      })
    );

    // If any task in the bottomLayer is dependent on the parentId, update it to be dependent on the newId
    setTaskArray((prev) =>
      prev.map((task) => {
        if (task.dependency === parentId) {
          return { ...task, dependency: newId };
        }
        return task; // Return the unchanged task if no dependency matches
      })
    );
  }
}

// CHECK IF GOAL IS READY
const checkGoalCompletion = (
  taskArray: Planner[],
  parentId: string
): boolean => {
  const currentGoal = taskArray.find((t) => t.id === parentId); // Find current goal using parentId
  const subtasks = getSubtasksFromId(taskArray, parentId); // Get subtasks from the current goal's ID

  if (
    currentGoal &&
    subtasks &&
    subtasks.length > 1 &&
    currentGoal.deadline !== undefined
  ) {
    return true;
  }

  return false;
};

// GET GOAL SUBTASKS FROM GOAL ID
export function getSubtasksFromId(taskArray: Planner[], id: string): Planner[] {
  const subtasks = taskArray.filter((task) => task.parentId === id);
  return subtasks;
}

// GET GOAL ROOT PARENT
function getRootParent(taskArray: Planner[], id: string): string | undefined {
  // Find the task by its id
  const task = taskArray.find((task) => task.id === id);

  if (!task) {
    return undefined;
  }

  // If task is not found or it has no parentId, return the task itself (root task)
  if (!task.parentId) {
    return task.id;
  }

  // Recursively find the root parent by looking at the parentId
  return getRootParent(taskArray, task.parentId);
}

// SORT TASKS BY DEPENDENCIES
export function sortTasksByDependencies(
  tasks: Planner[],
  taskArray: Planner[]
): Planner[] {
  // Arrays to hold different categories of tasks
  const rootTasks: Planner[] = [];
  const standAloneTasks: Planner[] = [];

  const sortedArray: Planner[] = [];

  // Find root tasks (no dependencies, but has dependents), and stand-alone tasks (no dependencies or dependents)
  tasks.forEach((task) => {
    if (
      !task.dependency ||
      !tasks.some((otherTask) => otherTask.id === task.dependency)
    ) {
      const hasDependents = tasks.some(
        (otherTask) => otherTask.dependency === task.id
      );

      if (hasDependents) {
        rootTasks.push(task);
      } else {
        standAloneTasks.push(task);
      }
    }
  });

  // Function to add a task and its dependents to the sorted array
  const addTaskWithDependents = (task: Planner) => {
    let isLooping = true;
    let currentTask = task;
    let currentId = task.id;

    while (isLooping) {
      sortedArray.push(currentTask);

      const nextTask = tasks.find((t) => {
        const bottomLayer = getTreeBottomLayer(taskArray, t.id);

        if (bottomLayer && bottomLayer.length > 0) {
          const item = bottomLayer.find((item) =>
            item.dependency?.includes(currentId)
          );

          if (item) {
            currentId = item.id;
            return t;
          }
        }
      });

      if (nextTask) currentTask = nextTask;
      else isLooping = false;
    }
  };

  // Add all root tasks and their dependents to the sorted array
  rootTasks.forEach(addTaskWithDependents);

  // Add stand-alone tasks to the sorted array
  sortedArray.push(...standAloneTasks);

  return sortedArray;
}

// GET BOTTOM (ACTIONABLE) LAYER OF GOAL
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
