import { Planner } from "@/lib/plannerClass";
import React from "react";
import { v4 as uuidv4 } from "uuid";

import { updateDependenciesOnDelete_ReturnArray } from "@/utils/goal-handlers/update-dependencies/updateDependenciesOnDelete";
import { SimpleEvent } from "@/types/calendarTypes";

interface AddSubtaskInterface {
  mainPlanner: Planner[];
  setMainPlanner: React.Dispatch<React.SetStateAction<Planner[]>>;
  parentId: string;
  taskDuration: number;
  taskTitle: string;
  resetTaskState: () => void;
}

export function addSubtask({
  mainPlanner,
  setMainPlanner,
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
      false,
      taskDuration < 5 ? 5 : taskDuration,
      undefined
    );

    setMainPlanner((prevTasks) => [...prevTasks, newTask]); // Spread prevTasks and add newTask

    resetTaskState();
  }

  updateDependenciesOnCreate(mainPlanner, setMainPlanner, parentId, newId);
}

interface DeleteGoalInterface {
  setMainPlanner: (
    arg: Planner[] | ((prev: Planner[]) => Planner[]),
    manuallyUpdatedCalendar?: SimpleEvent[]
  ) => void;
  taskId: string;
  parentId?: string | undefined;
  manuallyUpdatedCalendar?: SimpleEvent[];
}

export function deleteGoal({
  setMainPlanner,
  taskId,
  parentId,
  manuallyUpdatedCalendar,
}: DeleteGoalInterface) {
  setMainPlanner((mainPlanner: Planner[]) => {
    // Create a working copy of the state
    let newTaskArray = [...mainPlanner];

    if (parentId) {
      // Use your existing function that returns an updated array
      newTaskArray = updateDependenciesOnDelete_ReturnArray({
        mainPlanner: newTaskArray,
        taskId,
        parentId,
      });
    }

    // Get goal-tree (all IDs under the goal to be deleted)
    const treeIds: string[] = getTreeIds(newTaskArray, taskId);

    // Find the root parent
    const rootParent = getRootParent(newTaskArray, taskId);

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
  mainPlanner: Planner[];
  setMainPlanner: React.Dispatch<React.SetStateAction<Planner[]>>;
  taskId: string;
  parentId?: string | undefined;
}

export function deleteGoal_ReturnArray({
  mainPlanner,
  taskId,
  parentId,
}: DeleteGoalReturnArrayInterface): Planner[] {
  let newArray: Planner[] = mainPlanner;

  // Corrected type
  if (parentId) {
    newArray = updateDependenciesOnDelete_ReturnArray({
      mainPlanner,
      taskId,
      parentId,
    });
  }

  const treeIds: string[] = getTreeIds(mainPlanner, taskId);

  return (newArray = newArray.filter((t) => !treeIds.includes(t.id)));
}

// Get the correct dependency when creating a new subtask in a goal
export function updateDependenciesOnCreate(
  mainPlanner: Planner[],
  setMainPlanner: React.Dispatch<React.SetStateAction<Planner[]>>,
  parentId: string,
  newId: string
) {
  // Get potential siblings
  const siblings: Planner[] = mainPlanner.filter(
    (task) => task.parentId === parentId
  );

  // Check if the task is the first task of the first layer (the next one after root later), and if so return undefined
  const parentTask = mainPlanner.find((task) => task.id === parentId);

  if (parentTask && !parentTask.parentId && siblings.length === 0) return;

  // Get the ID of the root task/goal
  const rootParentId = getRootParent(mainPlanner, parentId);

  if (!rootParentId) {
    return;
  }

  if (siblings && siblings.length > 0) {
    // Order siblings
    const sortedSiblings = sortTasksByDependencies(mainPlanner, siblings);

    // Get last item in array
    const lastSiblingItem = sortedSiblings[sortedSiblings.length - 1];

    // Get the whole bottom layer (actionable items) from this item
    const bottomLayer = getSortedTreeBottomLayer(
      mainPlanner,
      lastSiblingItem.id
    );

    const lastBottomLayerItem = bottomLayer[bottomLayer.length - 1];

    // If a task exists in the bottom layer, which carries the ID of lastSiblingItem as its dependency, swap it for newId
    setMainPlanner((prev) =>
      prev.map((task) => {
        if (task.dependency === lastBottomLayerItem.id) {
          // Replace lastSiblingItem.id with newId in dependenciesS
          return { ...task, dependency: newId };
        }
        return task; // Return the unchanged task if no dependency matches
      })
    );

    // Set the last item ID in the dependency array of the new task (with newId)
    setMainPlanner((prev) =>
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

    const parentTask = mainPlanner.find((task) => task.id === parentId);
    const parentDependency = parentTask?.dependency;

    setMainPlanner((prev) =>
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
    setMainPlanner((prev) =>
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
  mainPlanner: Planner[],
  parentId: string
): boolean => {
  const currentGoal = mainPlanner.find((t) => t.id === parentId); // Find current goal using parentId
  const subtasks = getSubtasksById(mainPlanner, parentId); // Get subtasks from the current goal's ID

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
export function getSubtasksById(mainPlanner: Planner[], id: string): Planner[] {
  const subtasks = mainPlanner.filter((task) => task.parentId === id);
  return subtasks;
}

export function getSortedTreeBottomLayer(
  mainPlanner: Planner[],
  id: string
): Planner[] {
  const subtasks = getTreeBottomLayer(mainPlanner, id);
  const sortedSubtasks = sortTasksByDependencies(mainPlanner, subtasks);

  return sortedSubtasks;
}

// GET GOAL ROOT PARENT
export function getRootParent(
  mainPlanner: Planner[],
  id: string
): string | undefined {
  // Find the task by its id
  const task = mainPlanner.find((task) => task.id === id);

  if (!task) {
    return undefined;
  }

  // If task is not found or it has no parentId, return the task itself (root task)
  if (!task.parentId) {
    return task.id;
  }

  // Recursively find the root parent by looking at the parentId
  return getRootParent(mainPlanner, task.parentId);
}

// SORT TASKS BY DEPENDENCIES
export function sortTasksByDependencies(
  mainPlanner: Planner[],
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
          idsExistsInDependenciesOf(mainPlanner, otherTask.id, task.dependency)
        ))
    ) {
      // 3. Get all the items from the tasksToSort array that are NOT the one we're working with
      const siblings = tasksToSort.filter((t) => t.id !== task.id);

      if (!siblings || siblings.length === 0) return true; // If it has no siblings, return true by default.

      // 4. Check if either of the siblings (or their descendants) are dependent on the current task
      const hasSiblingDependents = siblings.some((t) =>
        idsExistsInDependenciesOf(mainPlanner, task.id, t.id)
      );

      // 5. Check if the current task (or it its descendants) are dependent on any of the siblings
      //    (shouldn't be the case for a root task, or parent of root task)
      const isDependentOnSiblings = siblings.some((t) =>
        idsExistsInDependenciesOf(mainPlanner, t.id, task.id)
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
      currentTaskBottomLayerIds = getTreeBottomLayer(mainPlanner, id).map(
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
        const bottomLayer = getTreeBottomLayer(mainPlanner, t.id);

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

export function getTaskIdTree(mainPlanner: Planner[], id: string): string[] {
  const subtasks: Planner[] = mainPlanner.filter(
    (task) => task.parentId === id
  );

  return subtasks.reduce(
    (allIds: string[], task: Planner) => {
      // Accumulate the current task's ID and its descendants' IDs
      return [
        ...allIds,
        task.id, // Include the current task's ID
        ...getTaskIdTree(mainPlanner, task.id), // Include the IDs of the entire tree under the current task
      ];
    },
    [id]
  ); // Start with the root ID itself
}

// GET BOTTOM (ACTIONABLE) LAYER OF GOAL
export function getTreeBottomLayer(
  mainPlanner: Planner[],
  id: string
): Planner[] {
  const subtasks: Planner[] = mainPlanner.filter(
    (task) => task.parentId === id
  );

  if (subtasks.length === 0)
    return mainPlanner.filter((task) => task.id === id);

  return subtasks.reduce((bottomLayer: Planner[], task: Planner) => {
    return [...bottomLayer, ...getTreeBottomLayer(mainPlanner, task.id)];
  }, []);
}

// GET ALL IDs IN THE TREE
export function getTreeIds(mainPlanner: Planner[], id: string): string[] {
  // Get the current task's subtasks
  const subtasks: Planner[] = mainPlanner.filter(
    (task) => task.parentId === id
  );

  // Collect the current task's ID and all its subtasks' IDs
  return subtasks.reduce(
    (allIds: string[], task: Planner) => {
      return [...allIds, ...getTreeIds(mainPlanner, task.id)];
    },
    [id]
  ); // Include the current task's id in the result
}

// GET ALL TASKS IN THE TREE
export function getGoalTree(mainPlanner: Planner[], id: string): Planner[] {
  // Get the current task's subtasks
  const subtasks: Planner[] = mainPlanner.filter(
    (task) => task.parentId === id
  );

  // Collect the current task's object and all its subtasks' objects
  return subtasks.reduce(
    (allTasks: Planner[], task: Planner) => {
      return [...allTasks, ...getGoalTree(mainPlanner, task.id)];
    },
    [mainPlanner.find((task) => task.id === id)!] // Include the current task's object in the result
  );
}

// Check if any ID's in the main tree matches any of the dependencies in the tree to check
export function idsExistsInDependenciesOf(
  mainPlanner: Planner[],
  mainTaskId: string | undefined,
  dependenciesToCheckId: string | undefined
): boolean {
  // Make sure the function can run
  if (
    !mainPlanner ||
    mainPlanner.length === 0 ||
    !mainTaskId ||
    !dependenciesToCheckId
  )
    return false;

  // Get all the id's from the main tree
  const mainTaskBottomLayer = getTreeBottomLayer(mainPlanner, mainTaskId);
  const mainTaskBottomLayerIds = mainTaskBottomLayer.map((t) => t.id);

  // Get all the dependencies from the tree to check
  const taskToCheckBottomLayer = getTreeBottomLayer(
    mainPlanner,
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

// SORT TASKS BY DEPENDENCIES
export async function sortTasksByDependenciesAsync(
  mainPlanner: Planner[],
  tasksToSort: Planner[]
): Promise<Planner[]> {
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
          idsExistsInDependenciesOf(mainPlanner, otherTask.id, task.dependency)
        ))
    ) {
      // 3. Get all the items from the tasksToSort array that are NOT the one we're working with
      const siblings = tasksToSort.filter((t) => t.id !== task.id);

      if (!siblings || siblings.length === 0) return true; // If it has no siblings, return true by default.

      // 4. Check if either of the siblings (or their descendants) are dependent on the current task
      const hasSiblingDependents = siblings.some((t) =>
        idsExistsInDependenciesOf(mainPlanner, task.id, t.id)
      );

      // 5. Check if the current task (or its descendants) are dependent on any of the siblings
      //    (shouldn't be the case for a root task, or parent of root task)
      const isDependentOnSiblings = siblings.some((t) =>
        idsExistsInDependenciesOf(mainPlanner, t.id, task.id)
      );

      // 6. If the task has siblings, and is not dependent on any of them, return true!
      if (hasSiblingDependents && !isDependentOnSiblings) {
        return true;
      }
    }
  });

  // Function to add a task and its dependents to the sorted array
  const addTaskWithDependents = async (task: Planner) => {
    let isLooping = true;
    let currentTask = task;
    let currentId = task.id;

    let currentTaskBottomLayerIds: string[] = [];
    setBottomIds(currentId);

    const visited = new Set();

    function setBottomIds(id: string) {
      currentTaskBottomLayerIds = getTreeBottomLayer(mainPlanner, id).map(
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

        // Mark task as visited to prevent a parent task from being added multiple times, in case of multiple children
        visited.add(currentTask.id);
      }

      // For every task in tasks
      const nextTask = tasksToSort.find((t) => {
        // Get the bottom layer
        const bottomLayer = getTreeBottomLayer(mainPlanner, t.id);

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
  if (rootTask) await addTaskWithDependents(rootTask);

  return sortedArray;
}
