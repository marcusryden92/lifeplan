"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Category } from "@/types/prisma";

// ============================================================================
// Category CRUD Operations
// ============================================================================

/**
 * Fetch all categories for the current user (flat list)
 */
export async function fetchCategories(): Promise<Category[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const categories = await db.category.findMany({
    where: { userId: session.user.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return categories;
}

/**
 * Fetch categories as a tree structure (top-level with nested children)
 */
export async function fetchCategoryTree(): Promise<
  (Category & { children: Category[] })[]
> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const categories = await db.category.findMany({
    where: {
      userId: session.user.id,
      parentId: null, // Only top-level categories
    },
    include: {
      children: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return categories;
}

/**
 * Fetch a single category by ID
 */
export async function fetchCategory(
  categoryId: string
): Promise<Category | null> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const category = await db.category.findFirst({
    where: { id: categoryId, userId: session.user.id },
  });

  return category;
}

/**
 * Fetch a category with its children
 */
export async function fetchCategoryWithChildren(
  categoryId: string
): Promise<(Category & { children: Category[] }) | null> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const category = await db.category.findFirst({
    where: { id: categoryId, userId: session.user.id },
    include: {
      children: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  return category;
}

/**
 * Create a new category
 */
export async function createCategory(data: {
  name: string;
  icon?: string;
  color?: string;
  parentId?: string;
  timeSlots?: any;
  isStrict?: boolean;
  locationId?: string | null;
}): Promise<Category> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // If parentId provided, verify it exists and belongs to user
  if (data.parentId) {
    const parent = await db.category.findFirst({
      where: { id: data.parentId, userId: session.user.id },
    });
    if (!parent) {
      throw new Error("Parent category not found");
    }
  }

  // If locationId provided, verify it exists and belongs to user
  if (data.locationId) {
    const location = await db.location.findFirst({
      where: { id: data.locationId, userId: session.user.id },
    });
    if (!location) {
      throw new Error("Location not found");
    }
  }

  // Get max sortOrder for the level (siblings)
  const maxSortOrder = await db.category.aggregate({
    where: {
      userId: session.user.id,
      parentId: data.parentId ?? null,
    },
    _max: { sortOrder: true },
  });

  const category = await db.category.create({
    data: {
      name: data.name,
      icon: data.icon,
      color: data.color,
      parentId: data.parentId,
      timeSlots: data.timeSlots ?? null,
      isStrict: data.isStrict ?? false,
      locationId: data.locationId ?? null,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      userId: session.user.id,
    },
  });

  return category;
}

/**
 * Update a category
 */
export async function updateCategory(
  categoryId: string,
  data: {
    name?: string;
    icon?: string | null;
    color?: string | null;
    timeSlots?: any;
    isStrict?: boolean;
    locationId?: string | null;
  }
): Promise<Category> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const category = await db.category.findFirst({
    where: { id: categoryId, userId: session.user.id },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  // If locationId provided, verify it exists and belongs to user
  if (data.locationId !== undefined && data.locationId !== null) {
    const location = await db.location.findFirst({
      where: { id: data.locationId, userId: session.user.id },
    });
    if (!location) {
      throw new Error("Location not found");
    }
  }

  const updated = await db.category.update({
    where: { id: categoryId },
    data: {
      name: data.name,
      icon: data.icon,
      color: data.color,
      timeSlots: data.timeSlots,
      isStrict: data.isStrict,
      locationId: data.locationId,
    },
  });

  return updated;
}

/**
 * Delete a category and optionally reassign its items
 * Children categories are cascade deleted
 */
export async function deleteCategory(
  categoryId: string,
  reassignToId?: string | null
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const category = await db.category.findFirst({
    where: { id: categoryId, userId: session.user.id },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  // If reassigning, verify target category exists
  if (reassignToId) {
    const target = await db.category.findFirst({
      where: { id: reassignToId, userId: session.user.id },
    });
    if (!target) {
      throw new Error("Target category not found");
    }
  }

  // Reassign planners if specified, otherwise they become uncategorized
  await db.planner.updateMany({
    where: {
      categoryId: categoryId,
      userId: session.user.id,
    },
    data: { categoryId: reassignToId ?? null },
  });

  // Also reassign planners from child categories
  const childIds = await db.category.findMany({
    where: { parentId: categoryId, userId: session.user.id },
    select: { id: true },
  });

  if (childIds.length > 0) {
    await db.planner.updateMany({
      where: {
        categoryId: { in: childIds.map((c) => c.id) },
        userId: session.user.id,
      },
      data: { categoryId: reassignToId ?? null },
    });
  }

  // Cascade delete handles children
  await db.category.delete({
    where: { id: categoryId },
  });
}

/**
 * Move a category to a new parent (or to root level)
 */
export async function moveCategory(
  categoryId: string,
  newParentId: string | null
): Promise<Category> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const category = await db.category.findFirst({
    where: { id: categoryId, userId: session.user.id },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  // Prevent moving a category to be its own child
  if (newParentId === categoryId) {
    throw new Error("Cannot move category to itself");
  }

  // If newParentId provided, verify it exists and isn't a descendant
  if (newParentId) {
    const newParent = await db.category.findFirst({
      where: { id: newParentId, userId: session.user.id },
    });
    if (!newParent) {
      throw new Error("Target parent category not found");
    }

    // Check if newParent is a descendant of category (would create cycle)
    let current = newParent;
    while (current.parentId) {
      if (current.parentId === categoryId) {
        throw new Error("Cannot move category to its own descendant");
      }
      const parent = await db.category.findFirst({
        where: { id: current.parentId, userId: session.user.id },
      });
      if (!parent) break;
      current = parent;
    }
  }

  // Get max sortOrder at new level
  const maxSortOrder = await db.category.aggregate({
    where: {
      userId: session.user.id,
      parentId: newParentId,
    },
    _max: { sortOrder: true },
  });

  const updated = await db.category.update({
    where: { id: categoryId },
    data: {
      parentId: newParentId,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return updated;
}

/**
 * Reorder categories at the same level
 */
export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Update each category's sortOrder
  await Promise.all(
    orderedIds.map((id, index) =>
      db.category.updateMany({
        where: { id, userId: session.user.id },
        data: { sortOrder: index },
      })
    )
  );
}

// ============================================================================
// Planner Category Assignment
// ============================================================================

/**
 * Assign a category to a planner item
 * Set categoryId to null to remove from category
 * If the item is a goal, the category cascades to all descendants (tasks/subgoals)
 */
export async function assignCategoryToPlanner(
  plannerId: string,
  categoryId: string | null
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const planner = await db.planner.findFirst({
    where: { id: plannerId, userId: session.user.id },
  });

  if (!planner) {
    throw new Error("Planner item not found");
  }

  // If categoryId is provided, verify it belongs to the user
  if (categoryId) {
    const category = await db.category.findFirst({
      where: { id: categoryId, userId: session.user.id },
    });

    if (!category) {
      throw new Error("Category not found");
    }
  }

  await db.planner.update({
    where: { id: plannerId },
    data: { categoryId },
  });

  // If this is a goal, cascade the category to all descendants
  if (planner.itemType === "goal") {
    // Get all planners for this user to traverse the tree
    const allPlanners = await db.planner.findMany({
      where: { userId: session.user.id },
    });

    // Get all descendant IDs (children, grandchildren, etc.)
    const { getTaskTreeIds } = await import("@/utils/goalPageHandlers");
    const descendantIds = getTaskTreeIds(allPlanners, plannerId);

    // Update all descendants with the same category
    if (descendantIds.length > 0) {
      await db.planner.updateMany({
        where: { id: { in: descendantIds } },
        data: { categoryId },
      });
    }
  }
}

/**
 * Assign a category to multiple planner items at once
 */
export async function assignCategoryToMultiplePlanners(
  plannerIds: string[],
  categoryId: string | null
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // If categoryId is provided, verify it belongs to the user
  if (categoryId) {
    const category = await db.category.findFirst({
      where: { id: categoryId, userId: session.user.id },
    });

    if (!category) {
      throw new Error("Category not found");
    }
  }

  await db.planner.updateMany({
    where: {
      id: { in: plannerIds },
      userId: session.user.id,
    },
    data: { categoryId },
  });
}

// ============================================================================
// Category Stats
// ============================================================================

/**
 * Get item counts for each category
 */
export async function fetchCategoryStats(): Promise<
  Map<string, { total: number; goals: number; tasks: number; plans: number }>
> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const stats = await db.planner.groupBy({
    by: ["categoryId", "itemType"],
    where: { userId: session.user.id },
    _count: true,
  });

  const result = new Map<
    string,
    { total: number; goals: number; tasks: number; plans: number }
  >();

  for (const stat of stats) {
    const categoryId = stat.categoryId ?? "uncategorized";
    const current = result.get(categoryId) ?? {
      total: 0,
      goals: 0,
      tasks: 0,
      plans: 0,
    };

    current.total += stat._count;
    if (stat.itemType === "goal") current.goals += stat._count;
    if (stat.itemType === "task") current.tasks += stat._count;
    if (stat.itemType === "plan") current.plans += stat._count;

    result.set(categoryId, current);
  }

  return result;
}

/**
 * Fetch categories with item counts (for display)
 */
export async function fetchCategoriesWithCounts(): Promise<
  (Category & { _count: { planners: number } })[]
> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const categories = await db.category.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: { planners: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return categories;
}
