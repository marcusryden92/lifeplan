"use client";

import React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { CategorySelect } from "@/components/categories/CategorySelect";
import { LocationSelector } from "@/components/locations/LocationSelector";
import { DateTimePickerWrapper } from "./DateTimePickerWrapper";
import { getPriorityColor } from "./constants";
import { useCalendarProvider } from "@/context/CalendarProvider";
import type { Planner, Category } from "@/types/prisma";

interface PropertiesCardProps {
  item: Planner;
  categories: Category[];
  locationOverrideEnabled: boolean;
  onUpdateField: (field: keyof Planner, value: unknown) => void;
  onCategoryChange: (categoryId: string | null) => void;
  onLocationChange: (locationId: string | null) => void;
  onToggleLocationOverride: () => void;
  onResetSubgoalLocations: () => void;
  onDateChange: (date: Date | undefined) => void;
}

export function PropertiesCard({
  item,
  categories,
  locationOverrideEnabled,
  onUpdateField,
  onCategoryChange,
  onLocationChange,
  onToggleLocationOverride,
  onResetSubgoalLocations,
  onDateChange,
}: PropertiesCardProps) {
  const { inheritedLocationMap } = useCalendarProvider();
  const inheritedInfo = inheritedLocationMap.get(item.id);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {/* Item Type Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Type</label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={item.itemType === "task" ? "default" : "outline"}
              onClick={() => onUpdateField("itemType", "task")}
              className="flex-1"
              size="sm"
            >
              Task
            </Button>
            <Button
              type="button"
              variant={item.itemType === "plan" ? "default" : "outline"}
              onClick={() => onUpdateField("itemType", "plan")}
              className="flex-1"
              size="sm"
            >
              Plan
            </Button>
            <Button
              type="button"
              variant={item.itemType === "goal" ? "default" : "outline"}
              onClick={() => onUpdateField("itemType", "goal")}
              className="flex-1"
              size="sm"
            >
              Goal
            </Button>
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <CategorySelect
            value={item.categoryId ?? "none"}
            categories={categories}
            includeNone
            noneLabel="No category"
            placeholder="Select category"
            onChange={(v) => onCategoryChange(v === "none" ? null : v)}
          />
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Priority</label>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={item.priority === p ? "default" : "outline"}
                onClick={() => onUpdateField("priority", p)}
                className={`flex-1 hover:opacity-90 transition-opacity ${item.priority === p ? getPriorityColor(p) : ""}`}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Location</label>
          <LocationSelector
            value={item.locationId ?? null}
            onChange={onLocationChange}
            isOverridden={locationOverrideEnabled}
            onToggleOverride={inheritedInfo ? onToggleLocationOverride : undefined}
            inheritedLocationName={inheritedInfo?.locationName}
            inheritedFromLabel={inheritedInfo?.fromLabel}
          />
          {item.itemType === "goal" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full mt-1.5 text-xs text-muted-foreground"
              onClick={onResetSubgoalLocations}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset all sub-goal locations
            </Button>
          )}
        </div>

        {/* Duration (for non-goals) */}
        {item.itemType !== "goal" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Duration (minutes)</label>
            <Input
              type="number"
              min={1}
              value={item.duration}
              onChange={(e) =>
                onUpdateField("duration", Number(e.target.value))
              }
            />
          </div>
        )}

        {/* Deadline / Scheduled Time */}
        {item.itemType === "plan" ? (
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Scheduled Time</label>
            <DateTimePickerWrapper item={item} onDateChange={onDateChange} />
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Deadline (optional)</label>
            <DateTimePickerWrapper item={item} onDateChange={onDateChange} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
