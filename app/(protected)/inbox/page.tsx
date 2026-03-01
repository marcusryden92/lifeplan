"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Inbox, Plus, Sparkles } from "lucide-react";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/Form";
import { InboxItem } from "./_components/InboxItem";
import { ClassifyItemDialog } from "./_components/ClassifyItemDialog";
import * as categoryActions from "@/actions/categories";
import { deleteGoal } from "@/utils/goalPageHandlers";
import type { Planner, Category } from "@/types/prisma";
import type { ItemType } from "@/prisma/generated/client";
import { v4 as uuidv4 } from "uuid";

const addItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export default function InboxPage() {
  const router = useRouter();
  const { userId, planner, updatePlannerArray, updateAll } = useCalendarProvider();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [classifyItem, setClassifyItem] = useState<Planner | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof addItemSchema>>({
    resolver: zodResolver(addItemSchema),
    defaultValues: { title: "" },
  });

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await categoryActions.fetchCategories();
        setCategories(cats);
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  // Get root-level items (not subtasks), sorted by creation date descending
  const inboxItems = planner
    .filter((item) => !item.parentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Items that need processing (no duration or unclassified)
  const unprocessedItems = inboxItems.filter(
    (item) => !item.duration || item.duration === 0
  );
  const processedItems = inboxItems.filter(
    (item) => item.duration && item.duration > 0
  );

  const handleAddItem = useCallback(
    (values: z.infer<typeof addItemSchema>) => {
      const now = new Date().toISOString();
      const newItem: Planner = {
        id: uuidv4(),
        title: values.title.trim(),
        parentId: null,
        itemType: "task",
        isReady: false,
        duration: 0, // Unprocessed
        deadline: null,
        starts: null,
        dependency: null,
        completedStartTime: null,
        completedEndTime: null,
        priority: 5,
        userId,
        color: null,
        locationId: null,
        useParentLocation: false,
        categoryId: null,
        createdAt: now,
        updatedAt: now,
      };

      updatePlannerArray((prev: Planner[]) => [...prev, newItem]);
      form.reset();
      inputRef.current?.focus();
    },
    [userId, updatePlannerArray, form]
  );

  const handleEditItem = useCallback(
    (id: string, title: string) => {
      updatePlannerArray((prev: Planner[]) =>
        prev.map((item) =>
          item.id === id ? { ...item, title, updatedAt: new Date().toISOString() } : item
        )
      );
    },
    [updatePlannerArray]
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      deleteGoal({ updateAll, taskId: id, parentId: null });
    },
    [updateAll]
  );

  const handleClassifyItem = useCallback(
    (data: {
      itemType: ItemType;
      duration: number;
      deadline?: string | null;
      starts?: string | null;
      categoryId?: string | null;
    }) => {
      if (!classifyItem) return;

      updatePlannerArray((prev: Planner[]) =>
        prev.map((item) =>
          item.id === classifyItem.id
            ? {
                ...item,
                itemType: data.itemType,
                duration: data.duration,
                deadline: data.deadline ?? null,
                starts: data.starts ?? null,
                categoryId: data.categoryId ?? null,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );

      // If it's a goal, redirect to detail page to add subtasks
      if (data.itemType === "goal") {
        router.push(`/items/${classifyItem.id}`);
      }

      setClassifyItem(null);
    },
    [classifyItem, updatePlannerArray, router]
  );

  const getCategoryForItem = (item: Planner) => {
    if (!item.categoryId) return undefined;
    return categories.find((c) => c.id === item.categoryId);
  };

  if (loading) {
    return (
      <div className="pageContainer bg-white mx-auto py-8 w-full">
        <div className="flex flex-col ml-20 max-w-[900px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pageContainer overflow-y-auto bg-white mx-auto py-8 w-full">
      <div className="flex flex-col ml-20 max-w-[900px]">
        <div className="space-y-2 mb-8">
          <h1 className="my-6 text-3xl font-bold">Inbox</h1>
          <p className="text-muted-foreground">
            Capture everything on your mind, then classify items as tasks, plans, or goals.
          </p>
        </div>

        {/* Quick Add */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleAddItem)}
                className="flex gap-3"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          {...field}
                          ref={inputRef}
                          placeholder="What's on your mind?"
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="h-11 gap-2">
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Unprocessed Items */}
        {unprocessedItems.length > 0 && (
          <Card className="mb-6 border-amber-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-amber-700">
                    <Sparkles className="w-5 h-5" />
                    Needs Processing ({unprocessedItems.length})
                  </CardTitle>
                  <CardDescription>
                    Click on an item to classify it as a task, plan, or goal
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {unprocessedItems.map((item) => (
                  <InboxItem
                    key={item.id}
                    item={item}
                    category={getCategoryForItem(item)}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onClassify={setClassifyItem}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processed Items */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="w-5 h-5" />
                  All Items ({processedItems.length})
                </CardTitle>
                <CardDescription>
                  Your classified items ready for scheduling
                </CardDescription>
              </div>
              {processedItems.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => router.push("/items")}
                >
                  View All Items
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {processedItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No items yet</p>
                <p className="text-sm">
                  Add items above to start capturing your thoughts
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {processedItems.slice(0, 10).map((item) => (
                  <InboxItem
                    key={item.id}
                    item={item}
                    category={getCategoryForItem(item)}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onClassify={setClassifyItem}
                  />
                ))}
                {processedItems.length > 10 && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => router.push("/items")}
                  >
                    View all {processedItems.length} items
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Classify Dialog */}
      <ClassifyItemDialog
        open={!!classifyItem}
        onOpenChange={(open) => !open && setClassifyItem(null)}
        item={classifyItem}
        categories={categories}
        onClassify={handleClassifyItem}
        onDelete={() => {
          if (classifyItem) {
            handleDeleteItem(classifyItem.id);
          }
        }}
      />
    </div>
  );
}
