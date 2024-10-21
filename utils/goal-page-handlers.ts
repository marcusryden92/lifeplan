import { Planner } from "@/lib/planner-class";
import React from "react";
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

  updateDependenciesOnCreate(taskArray, setTaskArray, parentId, newId);
}

interface DeleteGoalInterface {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  taskId: string;
  parentId?: string | undefined;
}

export function deleteGoal({
  taskArray,
  setTaskArray,
  taskId,
  parentId,
}: DeleteGoalInterface) {
  // Update dependencies if there are any
  updateDependenciesOnDelete({ taskArray, setTaskArray, taskId, parentId });

  // Get goal-tree (all IDs under the goal to be deleted)
  const treeIds: string[] = getTreeIds(taskArray, taskId);

  // Recursively delete the entire goal-tree
  setTaskArray((prev) => prev.filter((t) => !treeIds.includes(t.id)));
}

interface UpdateDependenciesOnDeleteInterface {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  taskId: string;
  parentId: string | undefined;
}

export function updateDependenciesOnDelete({
  taskArray,
  setTaskArray,
  taskId,
  parentId,
}: UpdateDependenciesOnDeleteInterface) {
  const bottomLayer: Planner[] = getTreeBottomLayer(taskArray, taskId);
  const sortedLayer: Planner[] = sortTasksByDependencies(
    taskArray,
    bottomLayer
  );

  const firstItem = sortedLayer[0];
  const lastItem = sortedLayer[sortedLayer.length - 1];

  const itemBeforeFirst = taskArray.find((t) => t.id === firstItem.dependency);
  const itemAfterLast = taskArray.find((t) => t.dependency === lastItem.id);

  const hasSiblings = parentId
    ? getSubtasksFromId(taskArray, parentId).length > 1
    : undefined;

  if (itemAfterLast && itemBeforeFirst) {
    if (hasSiblings) {
      setTaskArray((prev) =>
        prev.map((t) => {
          if (t.id === itemAfterLast.id) {
            return {
              ...t,
              dependency: itemBeforeFirst.id,
            };
          }
          return t;
        })
      );
    } else {
      setTaskArray((prev) =>
        prev.map((t) => {
          if (t.id === itemAfterLast.id) {
            return {
              ...t,
              dependency: parentId,
            };
          } else if (t.id === parentId) {
            return { ...t, dependency: itemBeforeFirst.id };
          }
          return t;
        })
      );
    }
  }
}

// Get the correct dependency when creating a new subtask in a goal
export function updateDependenciesOnCreate(
  taskArray: Planner[],
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  parentId: string,
  newId: string
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
    const sortedSiblings = sortTasksByDependencies(taskArray, siblings);

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
export const checkGoalForCompletion = (
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
  taskArray: Planner[],
  tasks: Planner[]
): Planner[] {
  // Arrays to hold different categories of tasks

  const sortedArray: Planner[] = [];

  // Find root tasks (no dependencies, but has dependents, or children has dependents)
  const rootTask: Planner | undefined = tasks.find((task) => {
    if (
      // If task doesn't have a dependency
      !task.dependency ||
      // Or if task has a dependency, but the dependency ID can't be found among the siblings or their children
      (task.dependency &&
        !tasks.some((otherTask) =>
          dependencyExistsInBottomLayerOf(
            taskArray,
            otherTask.id,
            task.dependency
          )
        ))
    ) {
      // Get all the items from the tasks array that are not the one we're working with
      const siblings = tasks.filter((t) => t.id !== task.id);

      if (!siblings || siblings.length === 0) return true;

      // Check if either of the siblings (or their descendants) are dependent on the current task
      const hasSiblingDependents = siblings.some((t) =>
        dependenciesExistsInBottomLayerOf(taskArray, task.id, t.id)
      );

      /* Check if the current task (or it its descendants) are dependent on any of the siblings
       * (shouldn't be the case for a root task, or parent of root task) */
      const isDependentOnSiblings = siblings.some((t) =>
        dependenciesExistsInBottomLayerOf(taskArray, t.id, task.id)
      );

      if (hasSiblingDependents && !isDependentOnSiblings) {
        return true;
      }
    }
  });

  // Function to add a task and its dependents to the sorted array
  const addTaskWithDependents = (task: Planner) => {
    let isLooping = true;
    let currentTask = task;
    let currentId = task.id;

    let currentTaskBottomLayerIds: string[] = [];
    setBottomIds(currentId);

    const visited = new Set();

    function setBottomIds(id: string) {
      currentTaskBottomLayerIds = getTreeBottomLayer(taskArray, id).map(
        (task) => task.id
      );
    }

    while (isLooping) {
      // If the task hasn't been processed yet, add it to the sorted array
      if (!visited.has(currentTask.id)) {
        sortedArray.push(currentTask);
        visited.add(currentTask.id); // Mark task as visited to prevent a parent task to be added multiple times
      }

      // For every task in tasks
      const nextTask = tasks.find((t) => {
        // Get the bottom layer
        const bottomLayer = getTreeBottomLayer(taskArray, t.id);

        if (bottomLayer && bottomLayer.length > 0) {
          // Find the item where the dependency matches the currentId
          const item = bottomLayer.find(
            (item) =>
              item.dependency?.includes(currentId) ||
              (item.dependency &&
                currentTaskBottomLayerIds.includes(item.dependency))
          );

          if (item && !visited.has(item.id)) {
            currentId = item.id;
            setBottomIds(item.id);
            return t;
          }
        }
      });

      if (nextTask) {
        currentTask = nextTask;
      } else {
        isLooping = false;
      }
    }
  };

  // Add all root tasks and their dependents to the sorted array
  if (rootTask) addTaskWithDependents(rootTask);

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

// GET ALL IDs IN THE TREE
export function getTreeIds(taskArray: Planner[], id: string): string[] {
  // Get the current task's subtasks
  const subtasks: Planner[] = taskArray.filter((task) => task.parentId === id);

  // Collect the current task's ID and all its subtasks' IDs
  return subtasks.reduce(
    (allIds: string[], task: Planner) => {
      return [...allIds, ...getTreeIds(taskArray, task.id)];
    },
    [id]
  ); // Include the current task's id in the result
}

export function dependencyExistsInBottomLayerOf(
  taskArray: Planner[],
  taskId: string | undefined,
  dependency: string | undefined
): boolean {
  if (!dependency || !taskId) return false;

  const bottomLayer = getTreeBottomLayer(taskArray, taskId);

  if (bottomLayer.some((t) => t.id?.includes(dependency))) return true;

  return false;
}

export function dependenciesExistsInBottomLayerOf(
  taskArray: Planner[],
  mainTaskId: string | undefined,
  taskToCheckId: string | undefined
): boolean {
  if (!taskArray || taskArray.length === 0 || !mainTaskId || !taskToCheckId)
    return false;

  const mainTaskBottomLayer = getTreeBottomLayer(taskArray, mainTaskId);
  const mainTaskBottomLayerIds = mainTaskBottomLayer.map((t) => t.id);

  const taskToCheckBottomLayer = getTreeBottomLayer(taskArray, taskToCheckId);
  const taskToCheckDependencies = taskToCheckBottomLayer.map(
    (t) => t.dependency
  );

  if (
    mainTaskBottomLayerIds.some((id) =>
      taskToCheckDependencies.some((dep) => id === dep)
    )
  )
    return true;

  return false;
}

export function checkIfBottomLayerContainsRoot(
  taskArray: Planner[],
  siblings: Planner[],
  mainTaskId: string
) {
  const mainTaskBottomLayer = getTreeBottomLayer(taskArray, mainTaskId);

  // If any task in the main bottom layer lacks a dependency, return true
  if (mainTaskBottomLayer.some((t) => !t.dependency)) return true;

  const mainTaskDependencies = mainTaskBottomLayer.map((t) => t.dependency);

  const comparisonIds = siblings
    .map((t) => getTreeBottomLayer(taskArray, t.id).map((b) => b.id))
    .flat();

  const matchingIds = comparisonIds.some((id) =>
    mainTaskDependencies.some((t) => t === id)
  );

  if (matchingIds) return true;
}
