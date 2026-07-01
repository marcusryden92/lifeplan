import { Planner } from "@/types/prisma";

import {
  getRootParentId,
  getSortedTreeBottomLayer,
  sortTasksByDependencies,
} from "@/utils/goalPageHandlers";

// Get the correct dependency when creating a new subtask in a goal
export function updateDependenciesOnCreate(
  newPlanner: Planner[],
  parentId: string,
  newId: string,
): Planner[] {
  // Create a copy of the planner to avoid direct mutation
  let updatedPlanner = [...newPlanner];

  // Get potential siblings
  const siblings: Planner[] = updatedPlanner.filter(
    (task) => task.parentId === parentId && task.id !== newId,
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
      lastSiblingItem.id,
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
