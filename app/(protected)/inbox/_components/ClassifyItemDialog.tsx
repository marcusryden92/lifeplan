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
import { Button } from "@/components/ui/Button.legacy";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { CategorySelect } from "@/components/categories/CategorySelect";
import { DateTimePicker } from "@/components/utilities/time-picker/DateTimePicker";
import type { Planner, Category } from "@/types/prisma";
import { PlannerType } from "@/types/prisma";

interface ClassifyItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Planner | null;
  categories: Category[];
  onClassify: (data: {
    plannerType: PlannerType;
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
  const [plannerType, setPlannerType] = useState<PlannerType>(
    item?.plannerType ?? PlannerType.task,
  );
  const [duration, setDuration] = useState<number>(item?.duration ?? 30);
  const [deadline, setDeadline] = useState<Date | undefined>(
    item?.deadline ? new Date(item.deadline) : undefined,
  );
  const [starts, setStarts] = useState<Date | undefined>(
    item?.starts ? new Date(item.starts) : undefined,
  );
  const [categoryId, setCategoryId] = useState<string | undefined>(
    item?.categoryId || undefined,
  );

  useEffect(() => {
    if (item) {
      setPlannerType(item.plannerType);
      setDuration(item.duration ?? 30);
      setDeadline(item.deadline ? new Date(item.deadline) : undefined);
      setStarts(item.starts ? new Date(item.starts) : undefined);
      setCategoryId(item.categoryId || undefined);
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onClassify({
      plannerType,
      duration,
      deadline: deadline?.toISOString() ?? null,
      starts:
        plannerType === PlannerType.plan
          ? (starts?.toISOString() ?? null)
          : null,
      categoryId: categoryId ?? null,
    });

    onOpenChange(false);
  };

  // No local rendering of connectors here; use shared CategorySelect

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Classify Item</DialogTitle>
            <DialogDescription>{item?.title}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4 h-[340px]">
            {/* Item Type */}
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={
                    plannerType === PlannerType.task ? "default" : "outline"
                  }
                  onClick={() => setPlannerType(PlannerType.task)}
                  className="flex-1"
                >
                  Task
                </Button>
                <Button
                  type="button"
                  variant={
                    plannerType === PlannerType.plan ? "default" : "outline"
                  }
                  onClick={() => setPlannerType(PlannerType.plan)}
                  className="flex-1"
                >
                  Plan
                </Button>
                <Button
                  type="button"
                  variant={
                    plannerType === PlannerType.goal ? "default" : "outline"
                  }
                  onClick={() => setPlannerType(PlannerType.goal)}
                  className="flex-1"
                >
                  Goal
                </Button>
              </div>
              <p className="text-xs text-muted-foreground h-4">
                {plannerType === PlannerType.task &&
                  "A one-time item without a specific date/time"}
                {plannerType === PlannerType.plan &&
                  "A scheduled appointment with a specific date/time"}
                {plannerType === PlannerType.goal &&
                  "A larger objective with multiple subtasks"}
              </p>
            </div>

            {/* Duration (not for goals) */}
            <div
              className={`flex flex-col gap-2 ${plannerType === PlannerType.goal ? "invisible" : ""}`}
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
              className={`flex flex-col gap-2 ${plannerType === PlannerType.goal ? "invisible" : ""}`}
            >
              <Label>
                {plannerType === PlannerType.plan
                  ? "Scheduled Time"
                  : "Deadline (optional)"}
              </Label>
              {plannerType === PlannerType.plan ? (
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
                placeholder="Select a category"
                onChange={(v) => setCategoryId(v === "none" ? undefined : v)}
              />
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={plannerType === PlannerType.plan && !starts}
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
