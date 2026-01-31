"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { FolderTree, Plus } from "lucide-react";
import { setCategories as setCategoriesInRedux } from "@/redux/slices/calendarSlice";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { CategoryItem } from "./_components/CategoryItem";
import { AddCategoryDialog } from "./_components/AddCategoryDialog";
import { EditCategoryDialog } from "./_components/EditCategoryDialog";
import * as categoryActions from "@/actions/categories";
import { buildCategoryTree, CategoryNode } from "@/utils/categoryUtils";
import type { Category } from "@/types/prisma";
import type { CategoryTimeSlot } from "@/types/categoryTypes";
import { Prisma } from "@/prisma/generated/client";

type CategoryWithChildren = Category & {
  children: Category[];
  _count?: { planners: number };
};

export default function CategoriesPage() {
  const dispatch = useDispatch();
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<string | undefined>();
  const [addParentName, setAddParentName] = useState<string | undefined>();

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch flat list and build full deep tree on client
      const flat = await categoryActions.fetchCategories();
      const tree = buildCategoryTree(flat);

      // Sync flat categories to Redux so other components see the updated list
      dispatch(setCategoriesInRedux(flat));

      // Fetch counts and attach to all nodes
      const withCountsArr = await categoryActions.fetchCategoriesWithCounts();
      const countMap = new Map(
        withCountsArr.map((c) => [c.id, c._count.planners])
      );

      const attachCounts = (nodes: CategoryNode[]): CategoryWithChildren[] =>
        nodes.map((node) => ({
          ...node,
          _count: { planners: countMap.get(node.id) ?? 0 },
          children: attachCounts(node.children) as Category[],
        }));

      const withCounts = attachCounts(tree);
      setCategories(withCounts);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load categories"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (data: {
    name: string;
    icon?: string;
    color?: string;
    parentId?: string;
  }) => {
    try {
      setError(null);
      await categoryActions.createCategory(data);
      await loadCategories();
      setSuccessMessage(`"${data.name}" created successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setAddDialogOpen(false);
      setAddParentId(undefined);
      setAddParentName(undefined);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create category"
      );
    }
  };

  const handleEditCategory = async (id: string, name: string) => {
    try {
      setError(null);
      await categoryActions.updateCategory(id, { name });
      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update category"
      );
    }
  };

  const handleSaveCategory = async (data: {
    name: string;
    timeSlots?: CategoryTimeSlot[];
    isStrict?: boolean;
    locationId?: string | null;
  }) => {
    if (!editingCategory) return;

    try {
      setError(null);
      await categoryActions.updateCategory(editingCategory.id, {
        ...data,
        timeSlots: data.timeSlots as Prisma.InputJsonValue | undefined,
      });
      await loadCategories();
      setSuccessMessage("Category updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
      setEditDialogOpen(false);
      setEditingCategory(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update category"
      );
    }
  };

  const openEditDialog = (id: string) => {
    const findCategory = (cats: CategoryWithChildren[]): Category | null => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        if (cat.children) {
          const found = findCategory(cat.children as CategoryWithChildren[]);
          if (found) return found;
        }
      }
      return null;
    };

    const category = findCategory(categories);
    if (category) {
      setEditingCategory(category);
      setEditDialogOpen(true);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteId) return;

    try {
      setError(null);
      await categoryActions.deleteCategory(deleteId);
      await loadCategories();
      setSuccessMessage("Category deleted successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete category"
      );
    } finally {
      setDeleteId(null);
      setDeleteName("");
    }
  };

  const openAddDialog = (parentId?: string, parentName?: string) => {
    setAddParentId(parentId);
    setAddParentName(parentName);
    setAddDialogOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    // Find category name
    const findName = (cats: CategoryWithChildren[]): string => {
      for (const cat of cats) {
        if (cat.id === id) return cat.name;
        if (cat.children) {
          const found = cat.children.find((c) => c.id === id);
          if (found) return found.name;
        }
      }
      return "this category";
    };

    setDeleteId(id);
    setDeleteName(findName(categories));
  };

  if (loading) {
    return (
      <div className="pageContainer bg-white mx-auto py-8 w-full">
        <div className="flex flex-col ml-20 max-w-[900px]">
          <p className="text-muted-foreground">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pageContainer overflow-y-auto bg-white mx-auto py-8 w-full">
      <div className="flex flex-col ml-20 max-w-[900px]">
        <div className="space-y-2 mb-8">
          <h1 className="my-6 text-3xl font-bold">Life Areas</h1>
          <p className="text-muted-foreground">
            Organize your goals and tasks into categories that represent
            different areas of your life.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-md bg-green-500/10 text-green-600 text-sm">
            {successMessage}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="w-5 h-5" />
                  Categories
                </CardTitle>
                <CardDescription>
                  Create categories like Career, Health, Relationships to
                  organize your items
                </CardDescription>
              </div>
              <Button onClick={() => openAddDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Category
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderTree className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No categories yet</p>
                <p className="text-sm">
                  Create your first category to start organizing your goals and
                  tasks
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {categories.map((category) => (
                  <CategoryItem
                    key={category.id}
                    category={category}
                    level={0}
                    onEdit={handleEditCategory}
                    onDelete={openDeleteDialog}
                    onOpenSettings={openEditDialog}
                    onAddSubcategory={(parentId) => {
                      const parent = categories.find((c) => c.id === parentId);
                      openAddDialog(parentId, parent?.name);
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggested categories for new users */}
        {categories.length === 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Quick Start</CardTitle>
              <CardDescription>
                Here are some common life areas to get you started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Career", icon: "💼", color: "#3b82f6" },
                  { name: "Health", icon: "❤️", color: "#ef4444" },
                  { name: "Relationships", icon: "👨‍👩‍👧", color: "#ec4899" },
                  { name: "Finance", icon: "💰", color: "#22c55e" },
                  { name: "Personal Growth", icon: "🌱", color: "#84cc16" },
                  { name: "Home", icon: "🏠", color: "#f59e0b" },
                ].map((suggestion) => (
                  <Button
                    key={suggestion.name}
                    variant="outline"
                    onClick={() => handleAddCategory(suggestion)}
                    className="gap-2"
                  >
                    <span>{suggestion.icon}</span>
                    {suggestion.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Category Dialog */}
      <AddCategoryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddCategory}
        parentId={addParentId}
        parentName={addParentName}
      />

      {/* Edit Category Dialog */}
      <EditCategoryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveCategory}
        category={editingCategory}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteName}&rdquo;? This
              will also delete all subcategories. Items in this category will
              become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
