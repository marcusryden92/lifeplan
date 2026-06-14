import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteGoal,
  getGoalTree,
  getTaskTreeIds,
} from "@/utils/goalPageHandlers";
import { toggleGoalIsReady } from "@/utils/goal-handlers/toggleGoalIsReady";
import {
  assignLocationToPlanner,
  assignLocationToMultiplePlanners,
  setUseParentLocation,
  setUseParentLocationMultiple,
} from "@/actions/locations";
import * as categoryActions from "@/actions/categories";
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
  // Discriminator so applyLocationChange / cancel know whether the cascade
  // dialog was triggered by changing the location (place dropdown) or by
  // toggling the override off. Previously this was inferred from a pre-flipped
  // locationOverrideEnabled — which meant a cancel left the visual toggle in
  // the wrong state.
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
            : p,
        ),
      );
    },
    [item, updatePlannerArray],
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
    async (categoryId: string | null) => {
      if (!item) return;
      await categoryActions.assignCategoryToPlanner(item.id, categoryId);

      const newCategoryHasLocation = categoryId
        ? !!categories.find((c) => c.id === categoryId)?.locationId
        : false;

      // Only update the target item's categoryId — descendants inherit it
      // automatically at scheduling time via parent-chain resolution.
      // Also mirror useParentLocation for location inheritance from the category.
      updatePlannerArray((prev: Planner[]) =>
        prev.map((p) => {
          if (p.id !== item.id) {
            // For goal descendants: update useParentLocation if category has a location
            if (
              item.plannerType === "goal" &&
              newCategoryHasLocation &&
              !p.locationId
            ) {
              const descendantIds = getTaskTreeIds(planner, item.id);
              if (descendantIds.includes(p.id)) {
                return { ...p, useParentLocation: true };
              }
            }
            return p;
          }
          const updated: Planner = {
            ...p,
            categoryId,
            updatedAt: new Date().toISOString(),
          };
          if (newCategoryHasLocation && !p.locationId) {
            updated.useParentLocation = true;
          }
          return updated;
        }),
      );
      updateAll();
    },
    [item, planner, categories, updatePlannerArray, updateAll],
  );

  const handleLocationChange = useCallback(
    async (locationId: string | null) => {
      if (!item) return;

      if (item.plannerType === "goal" && subtasks.length > 0) {
        setPendingKind("location-change");
        setPendingLocationId(locationId);
        setShowCascadeConfirm(true);
        return;
      }

      await assignLocationToPlanner(item.id, locationId);
      handleUpdateField("locationId", locationId);
    },
    [item, subtasks, handleUpdateField],
  );

  const applyLocationChange = useCallback(
    async (locationId: string | null, cascade: boolean) => {
      if (!item) return;

      try {
        const treeItems = getGoalTree(planner, item.id);
        const treeIds = treeItems.map((i) => i.id);

        if (pendingKind === "override-off") {
          // Toggling override OFF — set useParentLocation=true, preserve locationId
          if (cascade) {
            await setUseParentLocationMultiple(treeIds, true);
            updatePlannerArray((prev) =>
              prev.map((p) =>
                treeIds.includes(p.id) ? { ...p, useParentLocation: true } : p,
              ),
            );
          } else {
            await setUseParentLocation(item.id, true);
            handleUpdateField("useParentLocation", true);
          }
          // Now safe to flip the visual toggle — the data has been written.
          setLocationOverrideEnabled(false);
        } else if (cascade) {
          await assignLocationToMultiplePlanners(treeIds, locationId);
          updatePlannerArray((prev) =>
            prev.map((p) =>
              treeIds.includes(p.id) ? { ...p, locationId } : p,
            ),
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
        setPendingKind(null);
      }
    },
    [
      item,
      planner,
      updatePlannerArray,
      handleUpdateField,
      pendingKind,
    ],
  );

  const handleToggleLocationOverride = useCallback(async () => {
    if (!item || !categoryHasLocation) return;

    const newOverrideEnabled = !locationOverrideEnabled;

    if (
      !newOverrideEnabled &&
      item.plannerType === "goal" &&
      subtasks.length > 0
    ) {
      // Don't flip locationOverrideEnabled here — the toggle stays visually
      // "Override" until the cascade dialog confirms, so cancelling leaves it
      // in the correct state. The flip happens inside applyLocationChange.
      setPendingKind("override-off");
      setPendingLocationId(null);
      setShowCascadeConfirm(true);
      return;
    }

    // useParentLocation is the inverse of the override toggle
    const newUseParent = !newOverrideEnabled;
    await setUseParentLocation(item.id, newUseParent);
    handleUpdateField("useParentLocation", newUseParent);
    setLocationOverrideEnabled(newOverrideEnabled);
  }, [
    item,
    categoryHasLocation,
    locationOverrideEnabled,
    subtasks,
    handleUpdateField,
  ]);

  const confirmResetSubgoalLocations = useCallback(async () => {
    if (!item) return;

    const treeIds = getGoalTree(planner, item.id).map((i) => i.id);

    try {
      await setUseParentLocationMultiple(treeIds, true);
      updatePlannerArray((prev) =>
        prev.map((p) =>
          treeIds.includes(p.id) ? { ...p, useParentLocation: true } : p,
        ),
      );
      setLocationOverrideEnabled(false);
    } catch (error) {
      console.error("Failed to reset sub-goal locations:", error);
    } finally {
      setShowResetLocationsConfirm(false);
    }
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
