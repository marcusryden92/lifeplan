import { Planner } from "@/prisma/generated/client";
import { v4 as uuidv4 } from "uuid";
import { calendarColors } from "@/data/calendarColors";

import { updateDependenciesOnDelete_ReturnArray } from "@/utils/goal-handlers/update-dependencies/updateDependenciesOnDelete";
import { SimpleEvent } from "@/prisma/generated/client";
interface AddSubtaskInterface {
  userId?: string;
  planner: Planner[];
  updatePlannerArray: (
    planner: Planner[] | ((prev: Planner[]) => Planner[])
  ) => void;
  task: Planner;
  taskDuration: number;
  taskTitle: string;
  resetTaskState: () => void;
}

export function addSubtask({
  userId,
  planner,
  updatePlannerArray,
  task,
  taskDuration,
  taskTitle,
  resetTaskState,
}: AddSubtaskInterface) {
  const newId = uuidv4();

  if (userId && taskDuration && taskTitle) {
    const newTask: Planner = {
      title: taskTitle,
      id: newId,
      parentId: task.id || null,
      type: "goal",
      isReady: true,
      duration: taskDuration < 5 ? 5 : taskDuration,
      deadline: null,
      starts: null,
      dependency: null,
      completedStartTime: null,
      completedEndTime: null,
      color: (task?.color as string) || calendarColors[0],
      userId,
    };

    const newPlanner = [...planner, newTask];
    const updatedPlanner = updateDependenciesOnCreate(
      newPlanner,
      task.id,
      newId
    );

    updatePlannerArray(updatedPlanner);
    resetTaskState();
  }
}

interface DeleteGoalInterface {
  updatePlannerArray: (
    arg: Planner[] | ((prev: Planner[]) => Planner[]),
    manuallyUpdatedCalendar?: SimpleEvent[]
  ) => void;
  taskId: string;
  parentId: string | null;
  manuallyUpdatedCalendar?: SimpleEvent[];
}

export function deleteGoal({
  updatePlannerArray,
  taskId,
  parentId,
  manuallyUpdatedCalendar,
}: DeleteGoalInterface) {
  updatePlannerArray((planner: Planner[]) => {
    // Create a working copy of the state
    let newTaskArray = [...planner];

    if (parentId) {
      // Use your existing function that returns an updated array
      newTaskArray = updateDependenciesOnDelete_ReturnArray({
        planner: newTaskArray,
        taskId,
        parentId,
      });
    }

    // Get goal-tree (all IDs under the goal to be deleted)
    const treeIds: string[] = getTaskTreeIds(newTaskArray, taskId);

    // Find the root parent
    const rootParent = getRootParentId(newTaskArray, taskId);

    // Filter out the tasks to be deleted
    newTaskArray = newTaskArray.filter((t) => !treeIds.includes(t.id));

    // Check if root becomes empty
    if (rootParent && rootParent !== taskId) {
      const rootSubtasks = getSubtasksById(newTaskArray, rootParent);
      if (rootSubtasks.length === 0) {
        // Update the root parent's isReady property
        newTaskArray = newTaskArray.map((t) =>
          t.id === rootParent ? { ...t, isReady: false } : t
        );
      }
    }

    return newTaskArray;
  }, manuallyUpdatedCalendar);
}

interface DeleteGoalReturnArrayInterface {
  planner: Planner[];
  updatePlannerArray: (
    planner: Planner[] | ((prev: Planner[]) => Planner[])
  ) => void;
  taskId: string;
  parentId?: string | undefined;
}

export function deleteGoal_ReturnArray({
  planner,
  taskId,
  parentId,
}: DeleteGoalReturnArrayInterface): Planner[] {
  let newArray: Planner[] = planner;

  // Corrected type
  if (parentId) {
    newArray = updateDependenciesOnDelete_ReturnArray({
      planner,
      taskId,
      parentId,
    });
  }

  const treeIds: string[] = getTaskTreeIds(planner, taskId);

  return (newArray = newArray.filter((t) => !treeIds.includes(t.id)));
}

// Get the correct dependency when creating a new subtask in a goal
export function updateDependenciesOnCreate(
  newPlanner: Planner[],
  parentId: string,
  newId: string
): Planner[] {
  // Create a copy of the planner to avoid direct mutation
  let updatedPlanner = [...newPlanner];

  // Get potential siblings
  const siblings: Planner[] = updatedPlanner.filter(
    (task) => task.parentId === parentId && task.id !== newId
  );

  // Check if the task is the first task of the first layer (the next one after root later), and if so return the unchanged planner
  const parentTask = updatedPlanner.find((task) => task.id === parentId);

  if (parentTask && !parentTask.parentId && siblings.length === 0)
    return updatedPlanner;

  // Get the ID of the root task/goal
  const rootParentId = getRootParentId(updatedPlanner, parentId);

  if (!rootParentId) {
    return updatedPlanner;
  }

  if (siblings && siblings.length > 0) {
    // Order siblings
    const sortedSiblings = sortTasksByDependencies(updatedPlanner, siblings);

    // Get last item in array
    const lastSiblingItem = sortedSiblings[sortedSiblings.length - 1];

    // Get the whole bottom layer (actionable items) from this item
    const bottomLayer = getSortedTreeBottomLayer(
      updatedPlanner,
      lastSiblingItem.id
    );

    const lastBottomLayerItem = bottomLayer[bottomLayer.length - 1];

    // If a task exists in the bottom layer, which carries the ID of lastSiblingItem as its dependency, swap it for newId
    updatedPlanner = updatedPlanner.map((task) => {
      if (task.dependency === lastBottomLayerItem.id) {
        // Replace lastSiblingItem.id with newId in dependencies
        return { ...task, dependency: newId };
      }
      return task; // Return the unchanged task if no dependency matches
    });

    // Set the last item ID in the dependency array of the new task (with newId)
    updatedPlanner = updatedPlanner.map((task) => {
      if (task.id === newId) {
        return { ...task, dependency: lastBottomLayerItem.id }; // Add lastItem.id as a dependency for the new task
      }
      return task;
    });
  }

  if (!siblings || siblings.length === 0) {
    // Check if the parentId is dependent on anything
    const parentTask = updatedPlanner.find((task) => task.id === parentId);
    const parentDependency = parentTask?.dependency || null;

    updatedPlanner = updatedPlanner.map((task) => {
      if (
        task.id === parentId &&
        task.dependency &&
        task.dependency?.length > 0
      ) {
        return { ...task, dependency: null };
      }

      if (task.id === newId) {
        return { ...task, dependency: parentDependency };
      }
      return task;
    });

    // If any task in the bottomLayer is dependent on the parentId, update it to be dependent on the newId
    updatedPlanner = updatedPlanner.map((task) => {
      if (task.dependency === parentId) {
        return { ...task, dependency: newId };
      }
      return task; // Return the unchanged task if no dependency matches
    });
  }

  // Return the modified planner array
  return updatedPlanner;
}

// CHECK IF GOAL IS READY
export const checkGoalForCompletion = (
  planner: Planner[],
  parentId: string
): boolean => {
  const currentGoal = planner.find((t) => t.id === parentId); // Find current goal using parentId
  const subtasks = getSubtasksById(planner, parentId); // Get subtasks from the current goal's ID

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
export function getSubtasksById(planner: Planner[], id: string): Planner[] {
  const subtasks = planner.filter((task) => task.parentId === id);
  return subtasks;
}

export function getSortedTreeBottomLayer(
  planner: Planner[],
  id: string
): Planner[] {
  const subtasks = getTreeBottomLayer(planner, id);
  const sortedSubtasks = sortTasksByDependencies(planner, subtasks);

  return sortedSubtasks;
}

// GET GOAL ROOT PARENT
export function getRootParentId(
  planner: Planner[],
  id: string
): string | undefined {
  // Find the task by its id
  const task = planner.find((task) => task.id === id);

  if (!task) {
    return undefined;
  }

  // If task is not found or it has no parentId, return the task itself (root task)
  if (!task.parentId) {
    return task.id;
  }

  // Recursively find the root parent by looking at the parentId
  return getRootParentId(planner, task.parentId);
}

// SORT TASKS BY DEPENDENCIES
export function sortTasksByDependencies(
  planner: Planner[],
  tasksToSort: Planner[]
): Planner[] {
  // Arrays to hold different categories of tasks

  const sortedArray: Planner[] = [];

  // Find root tasks (no dependencies, but has dependents, or children has dependents)
  const rootTask: Planner | undefined = tasksToSort.find((task) => {
    if (
      // 1. If task doesn't have a dependency
      !task.dependency ||
      // 2. Or if task has a dependency, but the dependency ID can't be found among the siblings or their children
      (task.dependency &&
        !tasksToSort.some((otherTask) =>
          idsExistsInDependenciesOf(planner, otherTask.id, task.dependency)
        ))
    ) {
      // 3. Get all the items from the tasksToSort array that are NOT the one we're working with
      const siblings = tasksToSort.filter((t) => t.id !== task.id);

      if (!siblings || siblings.length === 0) return true; // If it has no siblings, return true by default.

      // 4. Check if either of the siblings (or their descendants) are dependent on the current task
      const hasSiblingDependents = siblings.some((t) =>
        idsExistsInDependenciesOf(planner, task.id, t.id)
      );

      // 5. Check if the current task (or it its descendants) are dependent on any of the siblings
      //    (shouldn't be the case for a root task, or parent of root task)
      const isDependentOnSiblings = siblings.some((t) =>
        idsExistsInDependenciesOf(planner, t.id, task.id)
      );

      // 6. If the task has siblings, and is not dependent on any of them, return true!
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
      currentTaskBottomLayerIds = getTreeBottomLayer(planner, id).map(
        (task) => task.id
      );
    }

    let infiniteLoop = 0;

    while (isLooping) {
      infiniteLoop++;
      if (infiniteLoop > 1000)
        throw new Error("sortTasksByDependencies exceeded 1000 loops.");
      // If the task hasn't been processed yet, add it to the sorted array
      if (!visited.has(currentTask.id)) {
        sortedArray.push(currentTask);

        // Mark task as visited to prevent a parent task to be added multiple times, in case of multiple children
        visited.add(currentTask.id);
      }

      // For every task in tasks
      const nextTask = tasksToSort.find((t) => {
        // Get the bottom layer
        const bottomLayer = getTreeBottomLayer(planner, t.id);

        if (bottomLayer && bottomLayer.length > 0) {
          // Find the item where the dependency matches the currentId
          const item = bottomLayer.find(
            (item) =>
              // Check if this item's dependency matches the current ID
              item.dependency?.includes(currentId) ||
              // Or any of the descendants of the current ID
              (item.dependency &&
                currentTaskBottomLayerIds.includes(item.dependency))
          );

          // If an item is found, and it hasn't yet been visited
          if (item && !visited.has(item.id)) {
            // Set the current ID to that of the item
            currentId = item.id;
            // And set the new bottom layer ID's to be those of the current item
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
export function getTreeBottomLayer(planner: Planner[], id: string): Planner[] {
  const subtasks: Planner[] = planner.filter((task) => task.parentId === id);

  if (subtasks.length === 0) return planner.filter((task) => task.id === id);

  return subtasks.reduce((bottomLayer: Planner[], task: Planner) => {
    return [...bottomLayer, ...getTreeBottomLayer(planner, task.id)];
  }, []);
}

// GET ALL IDs IN THE TREE
export function getTaskTreeIds(planner: Planner[], id: string): string[] {
  // Get the current task's subtasks
  const subtasks: Planner[] = planner.filter((task) => task.parentId === id);

  // Collect the current task's ID and all its subtasks' IDs
  return subtasks.reduce(
    (allIds: string[], task: Planner) => {
      return [...allIds, ...getTaskTreeIds(planner, task.id)];
    },
    [id]
  ); // Include the current task's id in the result
}

export function getCompleteTaskTreeIds(
  planner: Planner[],
  id: string
): string[] {
  const task = planner.find((task) => task.id === id);

  if (!task?.parentId) {
    return getTaskTreeIds(planner, id);
  } else {
    const rootParent = getRootParentId(planner, id);
    return rootParent ? getTaskTreeIds(planner, rootParent) : [];
  }
}

// GET ALL TASKS IN THE TREE
export function getGoalTree(planner: Planner[], id: string): Planner[] {
  // Get the current task's subtasks
  const subtasks: Planner[] = planner.filter((task) => task.parentId === id);

  // Collect the current task's object and all its subtasks' objects
  return subtasks.reduce(
    (allTasks: Planner[], task: Planner) => {
      return [...allTasks, ...getGoalTree(planner, task.id)];
    },
    [planner.find((task) => task.id === id)!] // Include the current task's object in the result
  );
}

// Check if any ID's in the main tree matches any of the dependencies in the tree to check
export function idsExistsInDependenciesOf(
  planner: Planner[],
  mainTaskId: string | null,
  dependenciesToCheckId: string | null
): boolean {
  // Make sure the function can run
  if (!planner || planner.length === 0 || !mainTaskId || !dependenciesToCheckId)
    return false;

  // Get all the id's from the main tree
  const mainTaskBottomLayer = getTreeBottomLayer(planner, mainTaskId);
  const mainTaskBottomLayerIds = mainTaskBottomLayer.map((t) => t.id);

  // Get all the dependencies from the tree to check
  const taskToCheckBottomLayer = getTreeBottomLayer(
    planner,
    dependenciesToCheckId
  );

  const taskToCheckDependencies = taskToCheckBottomLayer.map(
    (t) => t.dependency
  );

  // Check the arrays against eachother to see if any id matches
  if (
    mainTaskBottomLayerIds.some((id) =>
      taskToCheckDependencies.some((dep) => id === dep)
    )
  )
    return true;

  return false;
}
