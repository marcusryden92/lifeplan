import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteGoal, getGoalTree } from "@/utils/goalPageHandlers";
import { toggleGoalIsReady } from "@/utils/goal-handlers/toggleGoalIsReady";
import {
  assignLocationToPlanner,
  assignLocationToMultiplePlanners,
} from "@/actions/locations";
import * as categoryActions from "@/actions/categories";
import type { Planner } from "@/types/prisma";
import type { Dispatch, SetStateAction } from "react";

export function useItemHandlers(
  item: Planner | undefined,
  subtasks: Planner[],
  planner: Planner[],
  updatePlannerArray: Dispatch<SetStateAction<Planner[]>>,
  updateAll: () => void
) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCascadeConfirm, setShowCascadeConfirm] = useState(false);
  const [pendingLocationId, setPendingLocationId] = useState<string | null>(
    null
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
            : p
        )
      );
    },
    [item, updatePlannerArray]
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
      updateAll();
    },
    [item, handleUpdateField, updateAll]
  );

  const handleLocationChange = useCallback(
    async (locationId: string | null) => {
      if (!item) return;

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
            prev.map((p) => (treeIds.includes(p.id) ? { ...p, locationId } : p))
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

  return {
    showDeleteConfirm,
    setShowDeleteConfirm,
    showCascadeConfirm,
    pendingLocationId,
    handleSaveTitle,
    handleDelete,
    handleToggleReady,
    handleUpdateField,
    handleDateChange,
    handleCategoryChange,
    handleLocationChange,
    applyLocationChange,
    closeCascadeDialog: () => {
      setShowCascadeConfirm(false);
      setPendingLocationId(null);
    },
  };
}
