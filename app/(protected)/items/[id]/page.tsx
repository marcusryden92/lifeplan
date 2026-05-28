"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { useCalendarProvider } from "@/context/CalendarProvider";
import { DraggableContextProvider } from "@/components/draggable/DraggableContext";
import { Button } from "@/components/ui/Button.legacy";
import * as categoryActions from "@/actions/categories";
import { getSubtasksById } from "@/utils/goalPageHandlers";
import { totalSubtaskDuration } from "@/utils/taskArrayUtils";
import type { Category } from "@/types/prisma";

// Subcomponents
import { ItemHeader } from "./_components/ItemHeader";
import { PropertiesCard } from "./_components/PropertiesCard";
import { SubtasksCard } from "./_components/SubtasksCard";
import { DeleteConfirmDialog } from "./_components/DeleteConfirmDialog";
import { LocationCascadeDialog } from "./_components/LocationCascadeDialog";
import { useItemHandlers } from "./_components/useItemHandlers";

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;

  const { planner, updatePlannerArray, updateAll } = useCalendarProvider();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (!item || item.plannerType !== "goal") return [];
    return getSubtasksById(planner, item.id);
  }, [planner, item]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (!item) return 0;
    if (item.plannerType === "goal") {
      return totalSubtaskDuration(item.id, planner);
    }
    return item.duration;
  }, [item, planner]);

  // Get category
  const category = useMemo(() => {
    if (!item?.categoryId) return null;
    return categories.find((c) => c.id === item.categoryId);
  }, [item, categories]);

  const categoryHasLocation = !!category?.locationId;

  // Handlers
  const {
    showDeleteConfirm,
    setShowDeleteConfirm,
    showCascadeConfirm,
    pendingLocationId,
    locationOverrideEnabled,
    handleSaveTitle,
    handleDelete,
    handleToggleReady,
    handleUpdateField,
    handleDateChange,
    handleCategoryChange,
    handleLocationChange,
    handleToggleLocationOverride,
    showResetLocationsConfirm,
    setShowResetLocationsConfirm,
    confirmResetSubgoalLocations,
    applyLocationChange,
    closeCascadeDialog,
  } = useItemHandlers(
    item,
    subtasks,
    planner,
    updatePlannerArray,
    updateAll,
    categoryHasLocation,
    categories,
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
        <div className="flex flex-col ml-20 max-w-[1400px] pr-8">
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
          <ItemHeader
            item={item}
            category={category}
            totalDuration={totalDuration}
            subtasksLength={subtasks.length}
            onSaveTitle={handleSaveTitle}
            onToggleReady={handleToggleReady}
            onDelete={() => setShowDeleteConfirm(true)}
          />

          {/* Main content */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_2fr]">
            {/* Left column: Properties */}
            <div className="flex flex-col gap-6">
              <PropertiesCard
                item={item}
                categories={categories}
                locationOverrideEnabled={locationOverrideEnabled}
                onUpdateField={handleUpdateField}
                onCategoryChange={handleCategoryChange}
                onLocationChange={handleLocationChange}
                onToggleLocationOverride={handleToggleLocationOverride}
                onResetSubgoalLocations={() =>
                  setShowResetLocationsConfirm(true)
                }
                onDateChange={handleDateChange}
              />
            </div>

            {/* Right column: Subtasks */}
            <SubtasksCard item={item} subtasksLength={subtasks.length} />
          </div>
        </div>

        {/* Delete confirmation */}
        <DeleteConfirmDialog
          open={showDeleteConfirm}
          item={item}
          subtasksLength={subtasks.length}
          onOpenChange={setShowDeleteConfirm}
          onConfirm={handleDelete}
        />

        {/* Location cascade confirmation */}
        <LocationCascadeDialog
          open={showCascadeConfirm}
          onClose={closeCascadeDialog}
          onApplyToThis={() => applyLocationChange(pendingLocationId, false)}
          onApplyToAll={() => applyLocationChange(pendingLocationId, true)}
        />

        {/* Reset sub-goal locations confirmation */}
        {showResetLocationsConfirm && (
          <div
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
            onClick={() => setShowResetLocationsConfirm(false)}
          >
            <div
              className="bg-white rounded-lg p-4 shadow-lg max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm text-gray-700 mb-4">
                Reset all sub-goal locations to inherited? This will remove any
                custom location overrides.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResetLocationsConfirm(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={confirmResetSubgoalLocations}>
                  Reset all
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DraggableContextProvider>
  );
}
