"use client";

import { useState } from "react";
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
import { CategorySelect } from "@/components/categories/CategorySelect";
import { DateTimePicker } from "@/components/utilities/time-picker/DateTimePicker";
import type { Category } from "@/types/prisma";
import type { ItemType } from "@/prisma/generated/client";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onAdd: (data: {
    title: string;
    itemType: ItemType;
    duration: number;
    deadline?: string | null;
    starts?: string | null;
    categoryId?: string | null;
  }) => void;
}

export function AddItemDialog({
  open,
  onOpenChange,
  categories,
  onAdd,
}: AddItemDialogProps) {
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState<ItemType>("task");
  const [duration, setDuration] = useState<number>(30);
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [starts, setStarts] = useState<Date | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      itemType,
      duration,
      deadline: deadline?.toISOString() ?? null,
      starts: itemType === "plan" ? (starts?.toISOString() ?? null) : null,
      categoryId: categoryId ?? null,
    });
    onOpenChange(false);
  };

  const resetForm = () => {
    setTitle("");
    setItemType("task");
    setDuration(30);
    setDeadline(undefined);
    setStarts(undefined);
    setCategoryId(undefined);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>
              Create a new task, plan, or goal
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4 h-[420px]">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                autoFocus
              />
            </div>

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
                {itemType === "task" &&
                  "A one-time item without a specific date/time"}
                {itemType === "plan" &&
                  "A scheduled appointment with a specific date/time"}
                {itemType === "goal" &&
                  "A larger objective with multiple subtasks"}
              </p>
            </div>

            {/* Duration (not for goals) */}
            <div
              className={`flex flex-col gap-2 ${itemType === "goal" ? "invisible" : ""}`}
            >
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
            <div
              className={`flex flex-col gap-2 ${itemType === "goal" ? "invisible" : ""}`}
            >
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
              <CategorySelect
                value={categoryId ?? "none"}
                categories={categories}
                includeNone
                noneLabel="No category"
                onChange={(v) => setCategoryId(v === "none" ? undefined : v)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || (itemType === "plan" && !starts)}
            >
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
