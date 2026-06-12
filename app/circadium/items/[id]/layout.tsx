"use client";

import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Check, Pencil } from "lucide-react";
import { Button, Caption } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { DraggableContextProvider } from "@/components/draggable/DraggableContext";
import * as categoryActions from "@/actions/categories";
import { getSubtasksById } from "@/utils/goalPageHandlers";
import {
  completedSubtaskDuration,
  totalSubtaskDuration,
} from "@/utils/taskArrayUtils";
import { useItemHandlers } from "@/app/(protected)/items/[id]/_components/useItemHandlers";
import type { Category } from "@/types/prisma";
import type { PlannerType } from "@/lib/generated/db-client";

import { ItemProvider } from "./_components/ItemContext";
import { ItemTabs } from "./_components/ItemTabs";
import { LumenConfirmModal } from "./_components/LumenConfirmModal";
import {
  page,
  innerWrap,
  backRow,
  backLink,
  titleBlock,
  title as titleStyle,
  titleEditInput,
  titleClickable,
  editableTitleWrap,
  titleHoverRow,
  renamePencil,
  headActions,
  tabBodyWrap,
} from "./layout.css";

export default function ItemDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;

  const { planner, updatePlannerArray, updateAll } = useCalendarProvider();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  useEffect(() => {
    categoryActions
      .fetchCategories()
      .then((cats) => setCategories(cats))
      .catch((err) => console.error("Failed to load categories:", err))
      .finally(() => setLoadingCategories(false));
  }, []);

  const item = useMemo(
    () => planner.find((p) => p.id === itemId),
    [planner, itemId],
  );

  const subtasks = useMemo(() => {
    if (!item || item.plannerType !== "goal") return [];
    return getSubtasksById(planner, item.id);
  }, [planner, item]);

  const totalDuration = useMemo(() => {
    if (!item) return 0;
    if (item.plannerType === "goal") {
      return totalSubtaskDuration(item.id, planner);
    }
    return item.duration;
  }, [item, planner]);

  const completedDuration = useMemo(() => {
    if (!item) return 0;
    if (item.plannerType === "goal") {
      return completedSubtaskDuration(item.id, planner);
    }
    return item.completedEndTime ? item.duration : 0;
  }, [item, planner]);

  const category = useMemo(() => {
    if (!item?.categoryId) return null;
    return categories.find((c) => c.id === item.categoryId) ?? null;
  }, [item, categories]);
  const categoryHasLocation = !!category?.locationId;

  const handlers = useItemHandlers(
    item,
    subtasks,
    planner,
    updatePlannerArray,
    updateAll,
    categoryHasLocation,
    categories,
  );

  const {
    showDeleteConfirm,
    setShowDeleteConfirm,
    showCascadeConfirm,
    pendingLocationId,
    locationOverrideEnabled,
    handleSaveTitle,
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
  } = handlers;

  const handleDelete = () => {
    if (!item) return;
    handlers.handleDelete();
    router.push("/circadium/library");
  };

  const completedSubtasks = subtasks.filter((s) => s.completedEndTime).length;
  const totalSubtasks = subtasks.length;
  const pct =
    totalDuration > 0
      ? Math.round((completedDuration / totalDuration) * 100)
      : 0;

  if (loadingCategories) {
    return (
      <div className={page}>
        <div className={innerWrap}>
          <Caption>Loading…</Caption>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className={page}>
        <div className={innerWrap}>
          <button
            type="button"
            className={backLink}
            onClick={() => router.push("/circadium/library")}
          >
            <ArrowLeft size={12} strokeWidth={2.4} />
            Library
          </button>
          <p style={{ marginTop: 14 }}>
            <Caption>Item not found.</Caption>
          </p>
        </div>
      </div>
    );
  }

  const beginEditTitle = () => {
    setDraftTitle(item.title);
    setEditingTitle(true);
  };

  const commitTitle = () => {
    const t = draftTitle.trim();
    if (t && t !== item.title) handleSaveTitle(t);
    setEditingTitle(false);
  };

  const onTitleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitTitle();
    if (e.key === "Escape") setEditingTitle(false);
  };

  const isGoal = item.plannerType === "goal";

  return (
    <DraggableContextProvider>
      <ItemProvider
        value={{
          item,
          category,
          categories,
          subtasks,
          totalDuration,
          completedDuration,
          totalSubtasks,
          completedSubtasks,
          pct,
          locationOverrideEnabled,
          categoryHasLocation,
          saveTitle: handleSaveTitle,
          updateField: handleUpdateField,
          setPlannerType: (t: PlannerType) =>
            handleUpdateField("plannerType", t),
          changeCategory: handleCategoryChange,
          changeLocation: handleLocationChange,
          toggleLocationOverride: handleToggleLocationOverride,
          changeDate: handleDateChange,
          toggleReady: handleToggleReady,
          requestDelete: () => setShowDeleteConfirm(true),
          requestResetSubgoalLocations: () =>
            setShowResetLocationsConfirm(true),
        }}
      >
        <div className={page}>
          <div className={innerWrap}>
            <div className={backRow}>
              <button
                type="button"
                className={backLink}
                onClick={() => router.push("/circadium/library")}
              >
                <ArrowLeft size={12} strokeWidth={2.4} />
                Library
              </button>
            </div>

            <div className={titleBlock}>
              <div className={editableTitleWrap}>
                {editingTitle ? (
                  <input
                    autoFocus
                    className={titleEditInput}
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onBlur={commitTitle}
                    onKeyDown={onTitleKey}
                  />
                ) : (
                  <div className={titleHoverRow}>
                    <h1
                      className={`${titleStyle} ${titleClickable}`}
                      onClick={beginEditTitle}
                      title="Click to rename"
                    >
                      {item.title}
                    </h1>
                    <button
                      type="button"
                      className={renamePencil}
                      onClick={beginEditTitle}
                      aria-label="Rename"
                    >
                      <Pencil size={16} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>

              <div className={headActions}>
                {isGoal && (
                  <Button
                    variant={item.isReady ? "solid" : "glass"}
                    size="sm"
                    onClick={handleToggleReady}
                    disabled={subtasks.length === 0}
                    style={{
                      minWidth: 124,
                      justifyContent: "center",
                      ...(item.isReady
                        ? {
                            background: "#34d399",
                            borderColor: "#34d399",
                            color: "#fff",
                          }
                        : {}),
                    }}
                  >
                    <Check size={12} strokeWidth={2.4} />
                    {item.isReady ? "Ready" : "Mark ready"}
                  </Button>
                )}
              </div>
            </div>

            <ItemTabs itemId={item.id} subtaskCount={totalSubtasks} />

            <div className={tabBodyWrap}>{children}</div>
          </div>

          <LumenConfirmModal
            open={showDeleteConfirm}
            title="Delete item"
            body={
              <>
                Are you sure you want to delete <strong>{item.title}</strong>?
                {isGoal && totalSubtasks > 0 && (
                  <>
                    {" "}This will also delete {totalSubtasks} subtask
                    {totalSubtasks !== 1 ? "s" : ""}.
                  </>
                )}
              </>
            }
            confirmLabel="Delete"
            cancelLabel="Cancel"
            tone="danger"
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
          />

          <LumenConfirmModal
            open={showCascadeConfirm}
            title="Apply to subtasks?"
            body="Apply this location change to all subtasks of this goal, or just to this item?"
            confirmLabel="All subtasks"
            cancelLabel="This item only"
            onCancel={() => {
              applyLocationChange(pendingLocationId, false);
              closeCascadeDialog();
            }}
            onConfirm={() => {
              applyLocationChange(pendingLocationId, true);
              closeCascadeDialog();
            }}
          />

          <LumenConfirmModal
            open={showResetLocationsConfirm}
            title="Reset sub-goal places"
            body="Reset all sub-goal places to inherited? This will remove any custom location overrides on descendant items."
            confirmLabel="Reset all"
            cancelLabel="Cancel"
            onCancel={() => setShowResetLocationsConfirm(false)}
            onConfirm={confirmResetSubgoalLocations}
          />
        </div>
      </ItemProvider>
    </DraggableContextProvider>
  );
}
