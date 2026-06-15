"use client";

import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Loader } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import {
  upsertCategory,
  removeCategory,
} from "@/redux/slices/calendarSlice";
import type { AppDispatch, RootState } from "@/redux/store";
import {
  buildCategoryTree,
  getCategoryAndDescendants,
  type CategoryNode,
} from "@/utils/categoryUtils";
import type { Category } from "@/types/prisma";
import { WeekPlanModal } from "@/app/circadium/calendar/_components/WeekPlanModal";
import { LumenConfirmModal } from "@/app/circadium/items/[id]/_components/LumenConfirmModal";
import { AreaEditor, SWATCH_PALETTE } from "./_components/AreaEditor";
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
  railRow,
  railRowActive,
  railRowDot,
  railRowNoDot,
  railRowLabel,
  railRowCount,
  railRowAddChild,
  treeChevron,
  treeChevronSpacer,
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
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [windowsOpen, setWindowsOpen] = useState(false);
  // Native HTML5 drag state. draggedId tracks the source; dragOver tracks
  // which row + which third of it the pointer is currently over so the
  // TreeNode can paint the right indicator.
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{
    id: string;
    zone: "before" | "after" | "into";
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
  const handleDrop = (
    targetId: string,
    zone: "before" | "after" | "into",
  ) => {
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
                <TreeNode
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

      <LumenConfirmModal
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

type DragZone = "before" | "after" | "into";

// Transparent 1x1 GIF used as a custom drag image so the browser doesn't paint
// the default ghost screenshot of the row. The source row's data-dragging
// styling already signals which row is being moved.
const TRANSPARENT_DRAG_IMAGE: HTMLImageElement | null = (() => {
  if (typeof document === "undefined") return null;
  const img = new Image();
  img.src =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  return img;
})();

// Fixed-pixel reorder zones at the top and bottom of each row. Anywhere in
// between is the "into" (reparent) zone. Fixed pixels keep reordering hittable
// even on short rows where percentage-based thirds would be ~10px each.
const EDGE_ZONE_PX = 12;

function TreeNode({
  node,
  depth,
  expanded,
  toggleExpand,
  selectedId,
  onSelect,
  counts,
  onAddChild,
  draggedId,
  setDraggedId,
  dragOver,
  setDragOver,
  onDrop,
}: {
  node: CategoryNode;
  depth: number;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  counts: Map<string, number>;
  onAddChild: (parentId: string) => void;
  draggedId: string | null;
  setDraggedId: (id: string | null) => void;
  dragOver: { id: string; zone: DragZone } | null;
  setDragOver: (s: { id: string; zone: DragZone } | null) => void;
  onDrop: (targetId: string, zone: DragZone) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const active = selectedId === node.id;
  const count = counts.get(node.id) ?? 0;
  const isDragging = draggedId === node.id;
  const isDragTarget = dragOver?.id === node.id;

  return (
    <>
      <button
        type="button"
        className={`${railRow} ${active ? railRowActive : ""}`}
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          // Firefox requires data on the transfer object or the drag doesn't
          // initiate. The id itself is unused — actual source comes from
          // draggedId state.
          e.dataTransfer.setData("text/plain", node.id);
          if (TRANSPARENT_DRAG_IMAGE) {
            e.dataTransfer.setDragImage(TRANSPARENT_DRAG_IMAGE, 0, 0);
          }
          setDraggedId(node.id);
        }}
        onDragEnd={() => {
          setDraggedId(null);
          setDragOver(null);
        }}
        onDragOver={(e) => {
          if (!draggedId) return;
          // Always preventDefault + set dropEffect so the cursor stays as
          // "move" rather than flickering to "not-allowed" when crossing
          // rows. Self and cycle-creating drops are no-ops in onDrop.
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (draggedId === node.id) {
            if (dragOver?.id === node.id) setDragOver(null);
            return;
          }
          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top;
          let zone: DragZone;
          if (y < EDGE_ZONE_PX) zone = "before";
          else if (y > rect.height - EDGE_ZONE_PX) zone = "after";
          else zone = "into";
          if (dragOver?.id !== node.id || dragOver.zone !== zone) {
            setDragOver({ id: node.id, zone });
          }
        }}
        onDragLeave={(e) => {
          // Only clear when actually leaving the row, not when crossing into a
          // descendant element of the row.
          const next = e.relatedTarget as Node | null;
          if (next && e.currentTarget.contains(next)) return;
          if (dragOver?.id === node.id) setDragOver(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (!draggedId || draggedId === node.id || !dragOver) return;
          onDrop(node.id, dragOver.zone);
        }}
        data-dragging={isDragging ? "true" : "false"}
        data-drag-over={isDragTarget ? dragOver.zone : undefined}
      >
        {hasChildren ? (
          <span
            className={treeChevron}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
          >
            {isOpen ? (
              <ChevronDown size={11} strokeWidth={2.4} />
            ) : (
              <ChevronRight size={11} strokeWidth={2.4} />
            )}
          </span>
        ) : (
          <span className={treeChevronSpacer} />
        )}
        {node.color ? (
          <span className={railRowDot} style={{ background: node.color }} />
        ) : (
          <span className={railRowNoDot} />
        )}
        <span className={railRowLabel}>{node.name}</span>
        <span className={railRowCount}>{count}</span>
        {/* span (not button) because the row itself is already a button —
            nested buttons are invalid. role + tabIndex preserve a11y. */}
        <span
          role="button"
          tabIndex={-1}
          className={railRowAddChild}
          aria-label={`Add sub-category to ${node.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(node.id);
          }}
        >
          <Plus size={11} strokeWidth={2.4} />
        </span>
      </button>
      {hasChildren &&
        isOpen &&
        node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            toggleExpand={toggleExpand}
            selectedId={selectedId}
            onSelect={onSelect}
            counts={counts}
            onAddChild={onAddChild}
            draggedId={draggedId}
            setDraggedId={setDraggedId}
            dragOver={dragOver}
            setDragOver={setDragOver}
            onDrop={onDrop}
          />
        ))}
    </>
  );
}
