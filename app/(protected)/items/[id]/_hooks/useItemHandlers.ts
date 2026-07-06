import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteGoal,
  getGoalTree,
  getTaskTreeIds,
} from "@/utils/goalPageHandlers";
import { toggleGoalIsReady } from "@/utils/goal-handlers/toggleGoalIsReady";
import type { Planner, Category } from "@/types/prisma";
import type { Dispatch, SetStateAction } from "react";

export function useItemHandlers(
  item: Planner | undefined,
  subtasks: Planner[],
  planner: Planner[],
  updatePlannerArray: Dispatch<SetStateAction<Planner[]>>,
  updateAll: () => void,
  categoryHasLocation: boolean = false,
  categories: Category[] = [],
) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCascadeConfirm, setShowCascadeConfirm] = useState(false);
  const [showResetLocationsConfirm, setShowResetLocationsConfirm] =
    useState(false);
  const [pendingLocationId, setPendingLocationId] = useState<string | null>(
    null,
  );
  const [pendingKind, setPendingKind] = useState<
    "location-change" | "override-off" | null
  >(null);
  const [locationOverrideEnabled, setLocationOverrideEnabled] = useState(
    () => !categoryHasLocation || !item?.useParentLocation,
  );

  const handleSaveTitle = useCallback(
    (newTitle: string) => {
      if (!item || !newTitle.trim()) return;
      updatePlannerArray((prev: Planner[]) =>
        prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                title: newTitle.trim(),
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      );
    },
    [item, updatePlannerArray],
  );

  const handleDelete = useCallback(() => {
    if (!item) return;
    deleteGoal({ updateAll, taskId: item.id });
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
            : p,
        ),
      );
    },
    [item, updatePlannerArray],
  );

  const handleColorChange = useCallback(
    (color: string) => {
      if (!item) return;
      // A goal and its subtasks read as one block on the calendar, so recolor
      // the whole subtree, not just this row.
      const treeIds = new Set(getTaskTreeIds(planner, item.id));
      updatePlannerArray((prev: Planner[]) =>
        prev.map((p) =>
          treeIds.has(p.id)
            ? { ...p, color, updatedAt: new Date().toISOString() }
            : p,
        ),
      );
    },
    [item, planner, updatePlannerArray],
  );

  const handleDateChange = useCallback(
    (date: Date | undefined) => {
      if (!item) return;
      if (item.plannerType === "plan") {
        handleUpdateField("starts", date?.toISOString() ?? null);
      } else {
        handleUpdateField("deadline", date?.toISOString() ?? null);
      }
    },
    [item, handleUpdateField],
  );

  const handleCategoryChange = useCallback(
    (categoryId: string | null) => {
      if (!item) return;

      const newCategoryHasLocation = categoryId
        ? !!categories.find((c) => c.id === categoryId)?.locationId
        : false;

      updatePlannerArray((prev: Planner[]) => {
        const now = new Date().toISOString();
        const descendantIds = new Set(getTaskTreeIds(prev, item.id));
        descendantIds.delete(item.id);
        return prev.map((p) => {
          if (p.id === item.id) {
            const updated: Planner = {
              ...p,
              categoryId,
              updatedAt: now,
            };
            if (newCategoryHasLocation && !p.locationId) {
              updated.useParentLocation = true;
            }
            return updated;
          }
          if (!descendantIds.has(p.id)) return p;
          // Descendants never carry their own category — clear stale explicit
          // values so the whole subtree inherits the root's new one.
          const inheritLocation =
            newCategoryHasLocation && !p.locationId && !p.useParentLocation;
          if (p.categoryId === null && !inheritLocation) return p;
          const updated: Planner = {
            ...p,
            categoryId: null,
            updatedAt: now,
          };
          if (inheritLocation) updated.useParentLocation = true;
          return updated;
        });
      });
      updateAll();
    },
    [item, categories, updatePlannerArray, updateAll],
  );

  const handleLocationChange = useCallback(
    (locationId: string | null) => {
      if (!item) return;

      if (item.plannerType === "goal" && subtasks.length > 0) {
        setPendingKind("location-change");
        setPendingLocationId(locationId);
        setShowCascadeConfirm(true);
        return;
      }

      handleUpdateField("locationId", locationId);
    },
    [item, subtasks, handleUpdateField],
  );

  const applyLocationChange = useCallback(
    (locationId: string | null, cascade: boolean) => {
      if (!item) return;

      const treeItems = getGoalTree(planner, item.id);
      const treeIds = treeItems.map((i) => i.id);

      if (pendingKind === "override-off") {
        if (cascade) {
          updatePlannerArray((prev) =>
            prev.map((p) =>
              treeIds.includes(p.id) ? { ...p, useParentLocation: true } : p,
            ),
          );
        } else {
          handleUpdateField("useParentLocation", true);
        }
        setLocationOverrideEnabled(false);
      } else if (cascade) {
        updatePlannerArray((prev) =>
          prev.map((p) => (treeIds.includes(p.id) ? { ...p, locationId } : p)),
        );
      } else {
        handleUpdateField("locationId", locationId);
      }

      setShowCascadeConfirm(false);
      setPendingLocationId(null);
      setPendingKind(null);
    },
    [item, planner, updatePlannerArray, handleUpdateField, pendingKind],
  );

  const handleToggleLocationOverride = useCallback(() => {
    if (!item || !categoryHasLocation) return;

    const newOverrideEnabled = !locationOverrideEnabled;

    if (
      !newOverrideEnabled &&
      item.plannerType === "goal" &&
      subtasks.length > 0
    ) {
      setPendingKind("override-off");
      setPendingLocationId(null);
      setShowCascadeConfirm(true);
      return;
    }

    handleUpdateField("useParentLocation", !newOverrideEnabled);
    setLocationOverrideEnabled(newOverrideEnabled);
  }, [
    item,
    categoryHasLocation,
    locationOverrideEnabled,
    subtasks,
    handleUpdateField,
  ]);

  const confirmResetSubgoalLocations = useCallback(() => {
    if (!item) return;

    const treeIds = getGoalTree(planner, item.id).map((i) => i.id);

    updatePlannerArray((prev) =>
      prev.map((p) =>
        treeIds.includes(p.id) ? { ...p, useParentLocation: true } : p,
      ),
    );
    setLocationOverrideEnabled(false);
    setShowResetLocationsConfirm(false);
  }, [item, planner, updatePlannerArray]);

  return {
    showDeleteConfirm,
    setShowDeleteConfirm,
    showCascadeConfirm,
    pendingLocationId,
    locationOverrideEnabled,
    handleSaveTitle,
    handleDelete,
    handleToggleReady,
    handleUpdateField,
    handleColorChange,
    handleDateChange,
    handleCategoryChange,
    handleLocationChange,
    handleToggleLocationOverride,
    showResetLocationsConfirm,
    setShowResetLocationsConfirm,
    confirmResetSubgoalLocations,
    applyLocationChange,
    closeCascadeDialog: () => {
      setShowCascadeConfirm(false);
      setPendingLocationId(null);
      setPendingKind(null);
    },
  };
}
