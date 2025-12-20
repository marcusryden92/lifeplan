"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { DateTimePicker } from "@/components/utilities/time-picker/DateTimePicker";
import type { Planner, Category } from "@/types/prisma";
import type { ItemType } from "@/prisma/generated/client";

interface ClassifyItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Planner | null;
  categories: Category[];
  onClassify: (data: {
    itemType: ItemType;
    duration: number;
    deadline?: string | null;
    starts?: string | null;
    categoryId?: string | null;
  }) => void;
  onDelete: () => void;
}

export function ClassifyItemDialog({
  open,
  onOpenChange,
  item,
  categories,
  onClassify,
  onDelete,
}: ClassifyItemDialogProps) {
  const [itemType, setItemType] = useState<ItemType>("task");
  const [duration, setDuration] = useState<number>(30);
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [starts, setStarts] = useState<Date | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setItemType(item.itemType || "task");
      setDuration(item.duration || 30);
      setDeadline(item.deadline ? new Date(item.deadline) : undefined);
      setStarts(item.starts ? new Date(item.starts) : undefined);
      setCategoryId(item.categoryId || undefined);
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onClassify({
      itemType,
      duration,
      deadline: deadline?.toISOString() ?? null,
      starts: itemType === "plan" ? starts?.toISOString() ?? null : null,
      categoryId: categoryId ?? null,
    });

    onOpenChange(false);
  };

  // Build category options with hierarchy
  const categoryOptions = categories.map((cat) => ({
    id: cat.id,
    name: cat.parentId
      ? `  └ ${cat.name}` // Indent subcategories
      : cat.name,
    icon: cat.icon,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Classify Item</DialogTitle>
            <DialogDescription>
              {item?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4 h-[340px]">
            {/* Item Type */}
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={itemType === "task" ? "default" : "outline"}
                  onClick={() => setItemType("task")}
                  className="flex-1"
                >
                  Task
                </Button>
                <Button
                  type="button"
                  variant={itemType === "plan" ? "default" : "outline"}
                  onClick={() => setItemType("plan")}
                  className="flex-1"
                >
                  Plan
                </Button>
                <Button
                  type="button"
                  variant={itemType === "goal" ? "default" : "outline"}
                  onClick={() => setItemType("goal")}
                  className="flex-1"
                >
                  Goal
                </Button>
              </div>
              <p className="text-xs text-muted-foreground h-4">
                {itemType === "task" && "A one-time item without a specific date/time"}
                {itemType === "plan" && "A scheduled appointment with a specific date/time"}
                {itemType === "goal" && "A larger objective with multiple subtasks"}
              </p>
            </div>

            {/* Duration (not for goals) */}
            <div className={`flex flex-col gap-2 ${itemType === "goal" ? "invisible" : ""}`}>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>

            {/* Deadline (for tasks) / Scheduled Time (for plans) */}
            <div className={`flex flex-col gap-2 ${itemType === "goal" ? "invisible" : ""}`}>
              <Label>
                {itemType === "plan" ? "Scheduled Time" : "Deadline (optional)"}
              </Label>
              {itemType === "plan" ? (
                <DateTimePicker date={starts} setDate={setStarts} />
              ) : (
                <DateTimePicker date={deadline} setDate={setDeadline} />
              )}
            </div>

            {/* Category */}
            <div className="flex flex-col gap-2">
              <Label>Category (optional)</Label>
              <Select
                value={categoryId}
                onValueChange={(v) => setCategoryId(v === "none" ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon && <span className="mr-2">{cat.icon}</span>}
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onDelete();
                onOpenChange(false);
              }}
            >
              Delete
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={itemType === "plan" && !starts}
              >
                Save
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
