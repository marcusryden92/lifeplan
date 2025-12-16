"use client";

import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Clock,
  Calendar,
  Target,
  CheckSquare,
  CalendarClock,
  Trash2,
  Check,
  Edit2,
  X,
} from "lucide-react";
import { CheckCircledIcon } from "@radix-ui/react-icons";

import { useCalendarProvider } from "@/context/CalendarProvider";
import { DraggableContextProvider } from "@/components/draggable/DraggableContext";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
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
import { Badge } from "@/components/ui/Badge";
import { DateTimePicker } from "@/components/utilities/time-picker/DateTimePicker";
import PrioritySelector from "@/components/utilities/PrioritySelector";
import EventColorPicker from "@/components/events/EventColorPicker/EventColorPicker";
import { LocationSelector } from "@/components/locations/LocationSelector";

// Refine components for subtasks
import TaskList from "@/app/(protected)/refine/_components/TaskList";
import RootTaskListWrapper from "@/app/(protected)/refine/_components/task-item-subcomponents/RootTaskListWrapper";
import AddSubtask from "@/app/(protected)/refine/_components/task-item-subcomponents/AddSubtask";

import * as categoryActions from "@/actions/categories";
import {
  assignLocationToPlanner,
  assignLocationToMultiplePlanners,
} from "@/actions/locations";
import { deleteGoal, getSubtasksById, getGoalTree } from "@/utils/goalPageHandlers";
import { toggleGoalIsReady } from "@/utils/goal-handlers/toggleGoalIsReady";
import {
  totalSubtaskDuration,
  formatMinutesToHours,
} from "@/utils/taskArrayUtils";
import type { Planner, Category } from "@/types/prisma";
import type { ItemType } from "@/prisma/generated/client";

const typeConfig = {
  task: { icon: CheckSquare, color: "bg-amber-500", label: "Task" },
  plan: { icon: CalendarClock, color: "bg-blue-500", label: "Plan" },
  goal: { icon: Target, color: "bg-purple-500", label: "Goal" },
  template: { icon: Calendar, color: "bg-gray-500", label: "Template" },
  travel: { icon: Clock, color: "bg-green-500", label: "Travel" },
};

// Wrapper component for DateTimePicker to handle the state correctly
const DateTimePickerWrapper = memo(function DateTimePickerWrapper({
  item,
  onDateChange,
}: {
  item: Planner;
  onDateChange: (date: Date | undefined) => void;
}) {
  const initialDate = useMemo(() => {
    if (item.itemType === "plan" && item.starts) {
      return new Date(item.starts);
    }
    if (item.deadline) {
      return new Date(item.deadline);
    }
    return undefined;
  }, [item.itemType, item.starts, item.deadline]);

  const [date, setDate] = useState<Date | undefined>(initialDate);

  // Only notify parent when date changes (not on initial render)
  const prevDateRef = React.useRef<Date | undefined>(initialDate);
  useEffect(() => {
    if (date?.getTime() !== prevDateRef.current?.getTime()) {
      prevDateRef.current = date;
      onDateChange(date);
    }
  }, [date, onDateChange]);

  return <DateTimePicker date={date} setDate={setDate} />;
});

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;

  const { planner, updatePlannerArray, updateAll } = useCalendarProvider();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Location cascade
  const [showCascadeConfirm, setShowCascadeConfirm] = useState(false);
  const [pendingLocationId, setPendingLocationId] = useState<string | null>(null);

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

  // Find the item
  const item = useMemo(() => {
    return planner.find((p) => p.id === itemId);
  }, [planner, itemId]);

  // Get subtasks for goals
  const subtasks = useMemo(() => {
    if (!item || item.itemType !== "goal") return [];
    return getSubtasksById(planner, item.id);
  }, [planner, item]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (!item) return 0;
    if (item.itemType === "goal") {
      return totalSubtaskDuration(item.id, planner);
    }
    return item.duration;
  }, [item, planner]);

  // Get category
  const category = useMemo(() => {
    if (!item?.categoryId) return null;
    return categories.find((c) => c.id === item.categoryId);
  }, [item, categories]);

  const config = item ? typeConfig[item.itemType] || typeConfig.task : typeConfig.task;
  const Icon = config.icon;

  // Handlers
  const handleSaveTitle = useCallback(() => {
    if (!item || !editTitle.trim()) return;
    updatePlannerArray((prev: Planner[]) =>
      prev.map((p) =>
        p.id === item.id
          ? { ...p, title: editTitle.trim(), updatedAt: new Date().toISOString() }
          : p
      )
    );
    setIsEditingTitle(false);
  }, [item, editTitle, updatePlannerArray]);

  const handleDelete = useCallback(() => {
    if (!item) return;
    deleteGoal({ updateAll, taskId: item.id, parentId: null });
    router.push("/items");
  }, [item, updateAll, router]);

  const handleToggleReady = useCallback(() => {
    if (!item) return;
    toggleGoalIsReady(updatePlannerArray, item.id);
  }, [item, updatePlannerArray]);

  const handleUpdateField = useCallback(
    (field: keyof Planner, value: unknown) => {
      if (!item) return;
      updatePlannerArray((prev: Planner[]) =>
        prev.map((p) =>
          p.id === item.id
            ? { ...p, [field]: value, updatedAt: new Date().toISOString() }
            : p
        )
      );
    },
    [item, updatePlannerArray]
  );

  const handleTypeChange = useCallback(
    (newType: ItemType) => {
      if (!item) return;
      updatePlannerArray((prev: Planner[]) =>
        prev.map((p) =>
          p.id === item.id
            ? { ...p, itemType: newType, updatedAt: new Date().toISOString() }
            : p
        )
      );
    },
    [item, updatePlannerArray]
  );

  const handleDateChange = useCallback(
    (date: Date | undefined) => {
      if (!item) return;
      if (item.itemType === "plan") {
        handleUpdateField("starts", date?.toISOString() ?? null);
      } else {
        handleUpdateField("deadline", date?.toISOString() ?? null);
      }
    },
    [item, handleUpdateField]
  );

  const handleCategoryChange = useCallback(
    async (categoryId: string | null) => {
      if (!item) return;
      await categoryActions.assignCategoryToPlanner(item.id, categoryId);
      handleUpdateField("categoryId", categoryId);
    },
    [item, handleUpdateField]
  );

  const handleLocationChange = useCallback(
    async (locationId: string | null) => {
      if (!item) return;

      // If goal has subtasks, ask about cascading
      if (item.itemType === "goal" && subtasks.length > 0) {
        setPendingLocationId(locationId);
        setShowCascadeConfirm(true);
        return;
      }

      await assignLocationToPlanner(item.id, locationId);
      handleUpdateField("locationId", locationId);
    },
    [item, subtasks, handleUpdateField]
  );

  const applyLocationChange = useCallback(
    async (locationId: string | null, cascade: boolean) => {
      if (!item) return;

      try {
        if (cascade) {
          const treeItems = getGoalTree(planner, item.id);
          const treeIds = treeItems.map((i) => i.id);
          await assignLocationToMultiplePlanners(treeIds, locationId);
          updatePlannerArray((prev) =>
            prev.map((p) =>
              treeIds.includes(p.id) ? { ...p, locationId } : p
            )
          );
        } else {
          await assignLocationToPlanner(item.id, locationId);
          handleUpdateField("locationId", locationId);
        }
      } catch (error) {
        console.error("Failed to update location:", error);
      } finally {
        setShowCascadeConfirm(false);
        setPendingLocationId(null);
      }
    },
    [item, planner, updatePlannerArray, handleUpdateField]
  );

  if (loading) {
    return (
      <div className="pageContainer bg-white mx-auto py-8 w-full">
        <div className="flex flex-col ml-20 max-w-[900px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="pageContainer bg-white mx-auto py-8 w-full">
        <div className="flex flex-col ml-20 max-w-[900px]">
          <Button
            variant="ghost"
            onClick={() => router.push("/items")}
            className="mb-4 w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Items
          </Button>
          <p className="text-muted-foreground">Item not found</p>
        </div>
      </div>
    );
  }

  return (
    <DraggableContextProvider>
      <div className="pageContainer overflow-y-auto bg-white mx-auto py-8 w-full">
        <div className="flex flex-col ml-20 max-w-[900px] pr-8">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => router.push("/items")}
            className="mb-4 w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Items
          </Button>

          {/* Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {/* Type icon */}
                  <div className={`p-3 rounded-lg ${config.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex-1">
                    {/* Category */}
                    {category && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                        {category.icon && <span>{category.icon}</span>}
                        <span>{category.name}</span>
                      </div>
                    )}

                    {/* Title */}
                    {isEditingTitle ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="text-2xl font-bold h-auto py-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveTitle();
                            if (e.key === "Escape") setIsEditingTitle(false);
                          }}
                        />
                        <Button variant="ghost" size="sm" onClick={handleSaveTitle}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingTitle(false)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">{item.title}</h1>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditTitle(item.title);
                            setIsEditingTitle(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatMinutesToHours(totalDuration)}
                      </span>
                      {item.deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(item.deadline), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {item.itemType === "goal" && (
                    <Button
                      variant={item.isReady ? "default" : "outline"}
                      onClick={handleToggleReady}
                      disabled={subtasks.length === 0}
                      className="gap-2"
                    >
                      <CheckCircledIcon className="w-4 h-4" />
                      {item.isReady ? "Ready" : "Mark Ready"}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Properties */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select
                    value={item.itemType}
                    onValueChange={(v) => handleTypeChange(v as ItemType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="plan">Plan</SelectItem>
                      <SelectItem value="goal">Goal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select
                    value={item.categoryId ?? "none"}
                    onValueChange={(v) =>
                      handleCategoryChange(v === "none" ? null : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon && <span className="mr-2">{cat.icon}</span>}
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration (for non-goals) */}
                {item.itemType !== "goal" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Duration (minutes)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={item.duration}
                      onChange={(e) =>
                        handleUpdateField("duration", Number(e.target.value))
                      }
                    />
                  </div>
                )}

                {/* Deadline */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {item.itemType === "plan" ? "Scheduled Time" : "Deadline"}
                  </label>
                  <DateTimePickerWrapper
                    item={item}
                    onDateChange={handleDateChange}
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <LocationSelector
                    value={item.locationId ?? null}
                    onChange={handleLocationChange}
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <PrioritySelector
                    updatePlannerArray={updatePlannerArray}
                    taskId={item.id}
                    initialPriority={item.priority}
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Color</label>
                  <EventColorPicker taskId={item.id} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subtasks (for goals only) */}
          {item.itemType === "goal" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Subtasks</CardTitle>
                    <CardDescription>
                      Break down this goal into actionable tasks
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {subtasks.length} subtask{subtasks.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Subtask list using existing components */}
                <div className="mb-4">
                  <RootTaskListWrapper subtasksLength={subtasks.length}>
                    <TaskList id={item.id} />
                  </RootTaskListWrapper>
                </div>

                {/* Add subtask */}
                <AddSubtask task={item} parentId={item.id} isMainParent />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Delete confirmation */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{item.title}&rdquo;?
                {item.itemType === "goal" &&
                  subtasks.length > 0 &&
                  ` This will also delete ${subtasks.length} subtask${subtasks.length !== 1 ? "s" : ""}.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Location cascade confirmation */}
        {showCascadeConfirm && (
          <div
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
            onClick={() => {
              setShowCascadeConfirm(false);
              setPendingLocationId(null);
            }}
          >
            <div
              className="bg-white rounded-lg p-4 shadow-lg max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm text-gray-700 mb-4">
                Apply this location to all subtasks?
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyLocationChange(pendingLocationId, false)}
                >
                  This item only
                </Button>
                <Button
                  size="sm"
                  onClick={() => applyLocationChange(pendingLocationId, true)}
                >
                  All subtasks
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DraggableContextProvider>
  );
}
