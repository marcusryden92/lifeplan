import { Planner, SimpleEvent, Category, PlannerType } from "@/types/prisma";
import { v4 as uuidv4 } from "uuid";
import { calendarColors } from "@/data/calendarColors";

import { updateDependenciesOnDelete_ReturnArray } from "@/utils/goal-handlers/update-dependencies/updateDependenciesOnDelete";
import { updateDependenciesOnCreate } from "@/utils/goal-handlers/update-dependencies/updateDependenciesOnCreate";
import { updateDependenciesOnDuplicate } from "@/utils/goal-handlers/update-dependencies/updateDependenciesOnDuplicate";

interface AddSubtaskInterface {
  userId?: string;
  planner: Planner[];
  updatePlannerArray: (
    planner: Planner[] | ((prev: Planner[]) => Planner[]),
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
}: AddSubtaskInterface): string | undefined {
  const newId = uuidv4();
  const now = new Date();

  if (userId && taskDuration && taskTitle) {
    // Readiness cascades from the root: a subtree is ready or unready as one.
    const rootId = getRootParentId(planner, task.id);
    const rootItem = rootId ? planner.find((p) => p.id === rootId) : undefined;

    const newTask: Planner = {
      title: taskTitle,
      id: newId,
      parentId: task.id || null,
      plannerType: PlannerType.goal,
      isReady: rootItem?.isReady ?? false,
      isTriaged: true,
      duration: taskDuration < 15 ? 15 : taskDuration,
      deadline: null,
      starts: null,
      dependency: null,
      completedStartTime: null,
      completedEndTime: null,
      priority: Number(task.priority),
      color: (task?.color as string) || calendarColors[0],
      userId,
      locationId: null,
      useParentLocation: true,
      categoryId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const newPlanner = [...planner, newTask];
    const updatedPlanner = updateDependenciesOnCreate(
      newPlanner,
      task.id,
      newId,
    );

    updatePlannerArray(updatedPlanner);
    resetTaskState();
    return newId;
  }
  return undefined;
}

interface DuplicateSubtreeInterface {
  planner: Planner[];
  taskId: string;
}

// Clone a subtask and all of its descendants with fresh IDs, appending the
// copy at the end of the sibling chain. Root of the copy gets a "(copy)" suffix.
// The dependency chain runs through the bottom layer (leaves), so the boundary
// wiring is done on the new subtree's first/last BLI — not on the root — so
// the calendar renders A1, A2, A3, B1, B2, B3, X1, ... rather than
// A1, A2, A3, B, X1, ... (the whole cloned subtree slots in as leaves, not as
// a single node).
export function duplicateSubtree({
  planner,
  taskId,
}: DuplicateSubtreeInterface): { newPlanner: Planner[]; newRootId: string } | null {
  const original = planner.find((p) => p.id === taskId);
  if (!original || !original.parentId) return null;

  const tree = getGoalTree(planner, taskId);
  if (tree.length === 0) return null;

  const now = new Date().toISOString();
  const idMap = new Map<string, string>();
  for (const t of tree) idMap.set(t.id, uuidv4());

  const newTasks: Planner[] = tree.map((t) => {
    const isRoot = t.id === taskId;
    const newId = idMap.get(t.id)!;
    const parentId = isRoot
      ? original.parentId
      : t.parentId && idMap.has(t.parentId)
        ? idMap.get(t.parentId)!
        : t.parentId;
    // Internal chain dependencies get remapped to the cloned IDs. Any dep that
    // pointed outside the original subtree (the boundary dep on the first BLI)
    // is cleared here and rewired below to slot into the sibling chain.
    const dependency =
      t.dependency && idMap.has(t.dependency) ? idMap.get(t.dependency)! : null;
    return {
      ...t,
      id: newId,
      parentId,
      dependency,
      title: isRoot ? `${t.title} (copy)` : t.title,
      completedStartTime: null,
      completedEndTime: null,
      createdAt: now,
      updatedAt: now,
    };
  });

  const newRootId = idMap.get(taskId)!;
  const newPlanner = updateDependenciesOnDuplicate(
    [...planner, ...newTasks],
    original.parentId,
    newRootId,
  );

  return { newPlanner, newRootId };
}

interface DeleteGoalInterface {
  updateAll: (
    arg: Planner[] | ((prev: Planner[]) => Planner[]),
    manuallyUpdatedCalendar?: SimpleEvent[],
  ) => void;
  taskId: string;
  parentId: string | null;
  manuallyUpdatedCalendar?: SimpleEvent[];
}

export function deleteGoal({
  updateAll,
  taskId,
  parentId,
  manuallyUpdatedCalendar,
}: DeleteGoalInterface) {
  updateAll((planner: Planner[]) => {
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
          t.id === rootParent ? { ...t, isReady: false } : t,
        );
      }
    }

    return newTaskArray;
  }, manuallyUpdatedCalendar);
}

interface DeleteGoalReturnArrayInterface {
  planner: Planner[];
  updatePlannerArray: (
    planner: Planner[] | ((prev: Planner[]) => Planner[]),
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

// CHECK IF GOAL IS READY
export const checkGoalForCompletion = (
  planner: Planner[],
  parentId: string,
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
  id: string,
): Planner[] {
  const subtasks = getTreeBottomLayer(planner, id);
  const sortedSubtasks = sortTasksByDependencies(planner, subtasks);

  return sortedSubtasks;
}

// GET GOAL ROOT PARENT
export function getRootParentId(
  planner: Planner[],
  id: string,
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
  tasksToSort: Planner[],
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
          idsExistsInDependenciesOf(planner, otherTask.id, task.dependency),
        ))
    ) {
      // 3. Get all the items from the tasksToSort array that are NOT the one we're working with
      const siblings = tasksToSort.filter((t) => t.id !== task.id);

      if (!siblings || siblings.length === 0) return true; // If it has no siblings, return true by default.

      // 4. Check if either of the siblings (or their descendants) are dependent on the current task
      const hasSiblingDependents = siblings.some((t) =>
        idsExistsInDependenciesOf(planner, task.id, t.id),
      );

      // 5. Check if the current task (or it its descendants) are dependent on any of the siblings
      //    (shouldn't be the case for a root task, or parent of root task)
      const isDependentOnSiblings = siblings.some((t) =>
        idsExistsInDependenciesOf(planner, t.id, task.id),
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
        (task) => task.id,
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
                currentTaskBottomLayerIds.includes(item.dependency)),
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

  // Fallback: when tasks have no dependency relationships between them (the
  // common case for fresh subtasks), no rootTask is found and sortedArray stays
  // empty. Return the input order so downstream rendering/move logic can still
  // operate. Also append any tasks that weren't reached by the dependency walk.
  if (sortedArray.length === 0) return tasksToSort;
  if (sortedArray.length < tasksToSort.length) {
    const visited = new Set(sortedArray.map((t) => t.id));
    for (const t of tasksToSort) {
      if (!visited.has(t.id)) sortedArray.push(t);
    }
  }

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
    [id],
  ); // Include the current task's id in the result
}

export function getCompleteTaskTreeIds(
  planner: Planner[],
  id: string,
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
    [planner.find((task) => task.id === id)!], // Include the current task's object in the result
  );
}

export function getEffectiveCategoryId(
  planner: Planner[],
  id: string,
): string | null {
  const visited = new Set<string>();
  let currentId: string | null = id;

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const task = planner.find((t) => t.id === currentId);
    if (!task) break;

    if (task.categoryId) return task.categoryId;
    currentId = task.parentId;
  }

  return null;
}

export interface InheritedLocationInfo {
  locationName: string;
  fromLabel: string;
}

/**
 * Build a map of planner ID -> InheritedLocationInfo for all planners.
 * Computed once and shared via context so each component just reads from it.
 */
export function buildInheritedLocationMap(
  planners: Planner[],
  categories: Category[],
  locations: { id: string; name: string }[],
): Map<string, InheritedLocationInfo> {
  const result = new Map<string, InheritedLocationInfo>();
  const plannerMap = new Map(planners.map((p) => [p.id, p]));
  const findLocation = (id: string) => locations.find((l) => l.id === id);

  for (const planner of planners) {
    // Plan items always use their own location (no inheritance)
    if (planner.plannerType === PlannerType.plan) continue;

    // Walk up parent chain for an ancestor with a custom location
    const visited = new Set<string>();
    let currentId = planner.parentId;
    let info: InheritedLocationInfo | null = null;

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const parent = plannerMap.get(currentId);
      if (!parent) break;
      if (!parent.useParentLocation && parent.locationId) {
        const loc = findLocation(parent.locationId);
        if (loc) {
          info = { locationName: loc.name, fromLabel: parent.title };
          break;
        }
      }
      currentId = parent.parentId;
    }

    if (!info) {
      const effectiveCategoryId = getEffectiveCategoryId(planners, planner.id);
      if (effectiveCategoryId) {
        const category = categories.find((c) => c.id === effectiveCategoryId);
        if (category?.locationId) {
          const loc = findLocation(category.locationId);
          if (loc) info = { locationName: loc.name, fromLabel: category.name };
        }
      }
    }

    if (info) result.set(planner.id, info);
  }

  return result;
}

// Check if any ID's in the main tree matches any of the dependencies in the tree to check
export function idsExistsInDependenciesOf(
  planner: Planner[],
  mainTaskId: string | null,
  dependenciesToCheckId: string | null,
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
    dependenciesToCheckId,
  );

  const taskToCheckDependencies = taskToCheckBottomLayer.map(
    (t) => t.dependency,
  );

  // Check the arrays against eachother to see if any id matches
  if (
    mainTaskBottomLayerIds.some((id) =>
      taskToCheckDependencies.some((dep) => id === dep),
    )
  )
    return true;

  return false;
}
