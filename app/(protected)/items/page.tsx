"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, LayoutList, LayoutGrid, FolderTree } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { ItemCard } from "./_components/ItemCard";
import { ItemFilters, FilterState } from "./_components/ItemFilters";
import { AddItemDialog } from "./_components/AddItemDialog";
import * as categoryActions from "@/actions/categories";
import { fetchLocations } from "@/actions/locations";
import { getSubtasksById } from "@/utils/goalPageHandlers";
import type { Planner, Category, Location } from "@/types/prisma";
import type { ItemType } from "@/prisma/generated/client";

type ViewMode = "list" | "grid" | "tree";

export default function ItemsPage() {
  const { planner, updatePlannerArray } = useCalendarProvider();
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    type: "all",
    categoryId: "all",
    status: "all",
    sort: "newest",
  });

  // Load categories and locations
  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, locs] = await Promise.all([
          categoryActions.fetchCategories(),
          fetchLocations(),
        ]);
        setCategories(cats);
        setLocations(locs);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Get root-level items only
  const rootItems = useMemo(() => {
    return planner.filter((item) => !item.parentId);
  }, [planner]);

  // Calculate item counts
  const itemCounts = useMemo(() => {
    return {
      total: rootItems.length,
      tasks: rootItems.filter((i) => i.itemType === "task").length,
      plans: rootItems.filter((i) => i.itemType === "plan").length,
      goals: rootItems.filter((i) => i.itemType === "goal").length,
    };
  }, [rootItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    let result = rootItems;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((item) =>
        item.title.toLowerCase().includes(searchLower)
      );
    }

    // Type filter
    if (filters.type !== "all") {
      result = result.filter((item) => item.itemType === filters.type);
    }

    // Category filter
    if (filters.categoryId === "uncategorized") {
      result = result.filter((item) => !item.categoryId);
    } else if (filters.categoryId !== "all") {
      result = result.filter((item) => item.categoryId === filters.categoryId);
    }

    // Status filter
    if (filters.status === "ready") {
      result = result.filter((item) => item.isReady);
    } else if (filters.status === "not-ready") {
      result = result.filter((item) => !item.isReady && !item.completedEndTime);
    } else if (filters.status === "completed") {
      result = result.filter((item) => item.completedEndTime);
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (filters.sort) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "deadline":
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case "priority":
          return b.priority - a.priority;
        default:
          return 0;
      }
    });

    return result;
  }, [rootItems, filters]);

  // Group by category for tree view
  const groupedItems = useMemo(() => {
    if (viewMode !== "tree") return null;

    const groups = new Map<string | null, Planner[]>();

    filteredItems.forEach((item) => {
      const key = item.categoryId;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    return groups;
  }, [filteredItems, viewMode]);

  const getCategory = (categoryId: string | null) => {
    if (!categoryId) return undefined;
    return categories.find((c) => c.id === categoryId);
  };

  const getLocation = (locationId: string | null) => {
    if (!locationId) return undefined;
    return locations.find((l) => l.id === locationId);
  };

  const getSubtaskInfo = (item: Planner) => {
    if (item.itemType !== "goal") return { count: 0, completed: 0 };
    const subtasks = getSubtasksById(planner, item.id);
    const completed = subtasks.filter((s) => s.completedEndTime).length;
    return { count: subtasks.length, completed };
  };

  const handleAddItem = useCallback(
    (data: {
      title: string;
      itemType: ItemType;
      duration: number;
      deadline?: string | null;
      starts?: string | null;
      categoryId?: string | null;
    }) => {
      const newItem: Planner = {
        id: uuidv4(),
        title: data.title,
        itemType: data.itemType,
        duration: data.duration,
        deadline: data.deadline ?? null,
        starts: data.starts ?? null,
        categoryId: data.categoryId ?? null,
        parentId: null,
        priority: 1,
        isReady: data.itemType !== "goal",
        completedStartTime: null,
        completedEndTime: null,
        dependency: null,
        userId: "",
        color: null,
        locationId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatePlannerArray([...planner, newItem]);
    },
    [planner, updatePlannerArray]
  );

  if (loading) {
    return (
      <div className="pageContainer bg-white mx-auto py-8 w-full">
        <div className="flex flex-col ml-20 max-w-[1200px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pageContainer overflow-y-auto bg-white mx-auto py-8 w-full">
      <div className="flex flex-col ml-20 max-w-[1200px] pr-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Items</h1>
            <p className="text-muted-foreground mt-1">
              Browse and manage all your tasks, plans, and goals
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <ItemFilters
              filters={filters}
              onFilterChange={setFilters}
              categories={categories}
              itemCounts={itemCounts}
            />
          </CardContent>
        </Card>

        {/* View mode toggle */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
            {filters.search && ` matching "${filters.search}"`}
          </p>
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 px-3"
            >
              <LayoutList className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 px-3"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "tree" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("tree")}
              className="h-8 px-3"
            >
              <FolderTree className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Items */}
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No items found</p>
              {(filters.search || filters.type !== "all" || filters.categoryId !== "all") && (
                <Button
                  variant="link"
                  onClick={() =>
                    setFilters({
                      search: "",
                      type: "all",
                      categoryId: "all",
                      status: "all",
                      sort: "newest",
                    })
                  }
                  className="mt-2"
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "tree" && groupedItems ? (
          // Tree view - grouped by category
          <div className="space-y-6">
            {Array.from(groupedItems.entries()).map(([categoryId, items]) => {
              const category = categoryId ? getCategory(categoryId) : null;
              return (
                <Card key={categoryId ?? "uncategorized"}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {category?.icon && <span>{category.icon}</span>}
                      {category?.name ?? "Uncategorized"}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({items.length})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {items.map((item) => {
                        const subtaskInfo = getSubtaskInfo(item);
                        return (
                          <ItemCard
                            key={item.id}
                            item={item}
                            category={getCategory(item.categoryId)}
                            location={getLocation(item.locationId)}
                            subtaskCount={subtaskInfo.count}
                            completedSubtasks={subtaskInfo.completed}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : viewMode === "grid" ? (
          // Grid view
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const subtaskInfo = getSubtaskInfo(item);
              return (
                <ItemCard
                  key={item.id}
                  item={item}
                  category={getCategory(item.categoryId)}
                  location={getLocation(item.locationId)}
                  subtaskCount={subtaskInfo.count}
                  completedSubtasks={subtaskInfo.completed}
                />
              );
            })}
          </div>
        ) : (
          // List view
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const subtaskInfo = getSubtaskInfo(item);
              return (
                <ItemCard
                  key={item.id}
                  item={item}
                  category={getCategory(item.categoryId)}
                  location={getLocation(item.locationId)}
                  subtaskCount={subtaskInfo.count}
                  completedSubtasks={subtaskInfo.completed}
                />
              );
            })}
          </div>
        )}

        {/* Add Item Dialog */}
        <AddItemDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          categories={categories}
          onAdd={handleAddItem}
        />
      </div>
    </div>
  );
}
