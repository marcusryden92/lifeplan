"use client";

import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { Plus } from "lucide-react";
import { ConfirmModal, Loader } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import {
  upsertCategory,
  removeCategory,
} from "@/redux/slices/calendarSlice";
import type { AppDispatch, RootState } from "@/redux/store";
import {
  buildCategoryTree,
  getCategoryAndDescendants,
} from "@/utils/categoryUtils";
import type { Category } from "@/types/prisma";
import { WeekPlanModal } from "@/components/calendar/WeekPlanModal";
import { AreaEditor, SWATCH_PALETTE } from "./_components/AreaEditor";
import { AreaTreeNode, type DragZone } from "./_components/AreaTreeNode";
import {
  page,
  subHeader,
  pageTitle,
  titleSummary,
  mainGrid,
  rail,
  railHead,
  railBody,
  railFooter,
  railNewButton,
  mainCard,
  emptyMain,
  errorBanner,
} from "./page.css";

export default function AreasPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { planner, categories } = useCalendarProvider();
  const locations = useSelector(
    (state: RootState) => state.schedulingSettings.locations,
  );
  const isLoaded = useSelector(
    (state: RootState) => state.calendar.isLoaded,
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, _setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [windowsOpen, setWindowsOpen] = useState(false);
  // Native HTML5 drag state. draggedId tracks the source; dragOver tracks
  // which row + which third of it the pointer is currently over so the
  // TreeNode can paint the right indicator.
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{
    id: string;
    zone: DragZone;
  } | null>(null);

  const tree = useMemo(() => buildCategoryTree(categories), [categories]);

  // Default to first top-level area on first render once data is in.
  const effectiveSelectedId =
    selectedId ?? (tree.length > 0 ? tree[0].id : null);

  const selected = useMemo(
    () =>
      effectiveSelectedId
        ? categories.find((c) => c.id === effectiveSelectedId) ?? null
        : null,
    [categories, effectiveSelectedId],
  );

  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cat of categories) {
      const descendantIds = new Set(
        getCategoryAndDescendants(cat.id, categories),
      );
      const count = planner.filter(
        (i) => !i.parentId && i.categoryId && descendantIds.has(i.categoryId),
      ).length;
      counts.set(cat.id, count);
    }
    return counts;
  }, [categories, planner]);

  const subAreas = useMemo(
    () =>
      selected
        ? categories.filter((c) => c.parentId === selected.id)
        : [],
    [categories, selected],
  );

  // All mutations are pure Redux dispatches. useCalendarServerSync watches
  // state.calendar.categories, diffs against its prev-ref, and 300ms after
  // the user stops fiddling sends one batched sync transaction. No direct
  // server-action calls from this component.
  const replace = (next: Partial<Category>) => {
    if (!selected) return;
    dispatch(upsertCategory({ ...selected, ...next }));
  };

  const handleRename = (name: string) => replace({ name });
  const handleChangeColor = (color: string) => replace({ color });
  const handleChangeLocation = (locationId: string | null) =>
    replace({ locationId });
  const handleToggleStrict = () =>
    selected && replace({ isStrict: !selected.isStrict });
  const handleToggleUseTimeWindows = () =>
    selected && replace({ useTimeWindows: !selected.useTimeWindows });

  // Reparenting recomputes sortOrder client-side (append to the new sibling
  // group) so we don't need a separate moveCategory server action.
  const handleChangeParent = (parentId: string | null) => {
    if (!selected) return;
    const siblingMax = categories
      .filter((c) => c.parentId === parentId && c.id !== selected.id)
      .reduce((max, c) => Math.max(max, c.sortOrder), -1);
    replace({ parentId, sortOrder: siblingMax + 1 });
  };

  const handleConfirmDelete = () => {
    if (!deletingId) return;
    if (effectiveSelectedId === deletingId) {
      const remaining = categories.filter((c) => c.id !== deletingId);
      setSelectedId(remaining.find((c) => !c.parentId)?.id ?? null);
    }
    dispatch(removeCategory(deletingId));
    setDeletingId(null);
  };

  // Drag-and-drop: reorder siblings or reparent. Dropping onto the middle of
  // a row makes the dragged a child of the target; top/bottom thirds insert
  // it as a sibling before/after. Affected siblings are renumbered densely
  // (0..N-1) and dispatched — the sync layer batches them into one server
  // transaction. Cycle prevention: refuse to drop a category onto any of its
  // own descendants.
  const handleDrop = (targetId: string, zone: DragZone) => {
    const sourceId = draggedId;
    setDraggedId(null);
    setDragOver(null);
    if (!sourceId || sourceId === targetId) return;

    const descendants = new Set(getCategoryAndDescendants(sourceId, categories));
    if (descendants.has(targetId)) return;

    const dragged = categories.find((c) => c.id === sourceId);
    const target = categories.find((c) => c.id === targetId);
    if (!dragged || !target) return;

    const newParentId = zone === "into" ? target.id : target.parentId;
    const newSiblings = categories
      .filter((c) => c.parentId === newParentId && c.id !== sourceId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    let insertIdx: number;
    if (zone === "into") {
      insertIdx = newSiblings.length;
    } else {
      const targetIdx = newSiblings.findIndex((s) => s.id === targetId);
      insertIdx = zone === "before" ? targetIdx : targetIdx + 1;
    }

    const moved: Category = {
      ...dragged,
      parentId: newParentId,
      sortOrder: insertIdx,
    };
    newSiblings.splice(insertIdx, 0, moved);

    for (let i = 0; i < newSiblings.length; i++) {
      const sib = newSiblings[i];
      if (sib.id === sourceId || sib.sortOrder !== i) {
        dispatch(upsertCategory({ ...sib, sortOrder: i }));
      }
    }

    if (zone === "into") {
      setExpanded((prev) => new Set(prev).add(targetId));
    }
  };

  const handleCreate = (parentId: string | null = null) => {
    const swatch = SWATCH_PALETTE[categories.length % SWATCH_PALETTE.length];
    const id = uuidv4();
    const now = new Date().toISOString();
    // Sub-areas append to the end of their sibling group; top-level uses the
    // total category count as a reasonable tail position. Either way the sync
    // sends the sortOrder along, so the tree renders in the expected slot
    // without a separate moveCategory round-trip.
    const siblingMax = categories
      .filter((c) => c.parentId === parentId)
      .reduce((max, c) => Math.max(max, c.sortOrder), -1);
    const created: Category = {
      id,
      name: parentId ? "New sub-category" : "New category",
      icon: null,
      color: swatch,
      sortOrder: siblingMax + 1,
      isStrict: false,
      useTimeWindows: false,
      locationId: null,
      parentId,
      userId: "",
      timeSlots: [],
      createdAt: now,
      updatedAt: now,
    };
    dispatch(upsertCategory(created));
    setSelectedId(id);
    if (parentId) {
      setExpanded((prev) => new Set(prev).add(parentId));
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deletingName = deletingId
    ? categories.find((c) => c.id === deletingId)?.name ?? "this category"
    : "";

  return (
    <div className={page}>
      <div className={subHeader}>
        <h1 className={pageTitle}>Categories</h1>
        <span className={titleSummary}>
          {categories.length} categor{categories.length === 1 ? "y" : "ies"} ·{" "}
          {planner.filter((i) => !i.parentId && i.categoryId).length} categorized
        </span>
      </div>

      {error && <div className={errorBanner}>{error}</div>}

      <div className={mainGrid}>
        <aside className={rail}>
          <div className={railHead}>Categories</div>
          <div className={railBody}>
            {!isLoaded ? (
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px 8px",
                }}
              >
                <Loader size="md" label="Loading categories" />
              </div>
            ) : tree.length === 0 ? (
              <div
                style={{
                  padding: "12px 8px",
                  fontSize: 12.5,
                  color: "var(--muted)",
                }}
              >
                No categories yet — create one.
              </div>
            ) : (
              tree.map((node) => (
                <AreaTreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  selectedId={effectiveSelectedId}
                  onSelect={setSelectedId}
                  counts={itemCounts}
                  onAddChild={(parentId) => handleCreate(parentId)}
                  draggedId={draggedId}
                  setDraggedId={setDraggedId}
                  dragOver={dragOver}
                  setDragOver={setDragOver}
                  onDrop={handleDrop}
                />
              ))
            )}
          </div>
          <div className={railFooter}>
            <button
              type="button"
              className={railNewButton}
              onClick={() => handleCreate()}
            >
              <Plus size={13} strokeWidth={2.4} />
              New category
            </button>
          </div>
        </aside>

        <section className={mainCard}>
          {!isLoaded ? (
            <div className={emptyMain}>
              <Loader size="md" label="Loading categories" />
            </div>
          ) : selected ? (
            <AreaEditor
              category={selected}
              categories={categories}
              locations={locations}
              itemCount={itemCounts.get(selected.id) ?? 0}
              subAreas={subAreas}
              subAreaCounts={itemCounts}
              onRename={handleRename}
              onChangeColor={handleChangeColor}
              onChangeParent={handleChangeParent}
              onChangeLocation={handleChangeLocation}
              onToggleStrict={handleToggleStrict}
              onToggleUseTimeWindows={handleToggleUseTimeWindows}
              onDelete={() => setDeletingId(selected.id)}
              onSelectSubArea={setSelectedId}
              onOpenWindows={() => setWindowsOpen(true)}
            />
          ) : (
            <div className={emptyMain}>
              Pick a category from the left, or create a new one to begin.
            </div>
          )}
        </section>
      </div>

      <WeekPlanModal
        open={windowsOpen}
        onClose={() => setWindowsOpen(false)}
        initialMode="windows"
        focusedCategoryId={selected?.id ?? null}
      />

      <ConfirmModal
        open={!!deletingId}
        title="Delete category?"
        tone="danger"
        confirmLabel="Delete"
        body={
          <>
            <p style={{ margin: 0 }}>
              Delete &ldquo;{deletingName}&rdquo;? This also deletes all
              sub-categories. Items in this category become uncategorized.
            </p>
          </>
        }
        onCancel={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

