"use client";

import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui";
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
  spacer,
  actionCluster,
  mainGrid,
  rail,
  railHead,
  railBody,
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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [windowsOpen, setWindowsOpen] = useState(false);

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
        <span className={spacer} />
        <div className={actionCluster}>
          <Button variant="solid" size="sm" onClick={() => handleCreate()}>
            <Plus size={13} strokeWidth={2.4} />
            New category
          </Button>
        </div>
      </div>

      {error && <div className={errorBanner}>{error}</div>}

      <div className={mainGrid}>
        <aside className={rail}>
          <div className={railHead}>Categories</div>
          <div className={railBody}>
            {tree.length === 0 ? (
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
                />
              ))
            )}
          </div>
        </aside>

        <section className={mainCard}>
          {selected ? (
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

function TreeNode({
  node,
  depth,
  expanded,
  toggleExpand,
  selectedId,
  onSelect,
  counts,
  onAddChild,
}: {
  node: CategoryNode;
  depth: number;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  counts: Map<string, number>;
  onAddChild: (parentId: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const active = selectedId === node.id;
  const count = counts.get(node.id) ?? 0;

  return (
    <>
      <button
        type="button"
        className={`${railRow} ${active ? railRowActive : ""}`}
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: 8 + depth * 14 }}
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
          />
        ))}
    </>
  );
}
