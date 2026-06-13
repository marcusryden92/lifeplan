"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import {
  upsertCategory,
  removeCategory,
} from "@/redux/slices/calendarSlice";
import type { AppDispatch, RootState } from "@/redux/store";
import * as categoryActions from "@/actions/categories";
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
  treeChevron,
  treeChevronSpacer,
  railFooter,
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

  // Same shape as useCalendarServerSync's 300ms debounce: optimistic dispatch
  // is instant, server write fires once the user stops fiddling. Keyed by
  // (categoryId, field) so flipping color doesn't cancel a pending strict
  // write and vice versa.
  //
  // We intentionally do NOT re-dispatch the server response on success. The
  // optimistic value is the user's intent; overwriting it with a stale server
  // reply that arrives after a newer click would flick the UI back to the
  // older value. On failure we refetch the canonical row so the UI re-syncs.
  const SERVER_DEBOUNCE_MS = 300;
  const writeTimersRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );

  useEffect(
    () => () => {
      for (const t of writeTimersRef.current.values()) clearTimeout(t);
      writeTimersRef.current.clear();
    },
    [],
  );

  const scheduleWrite = (
    categoryId: string,
    field: string,
    serverCall: () => Promise<Category>,
    errorLabel: string,
  ) => {
    const key = `${categoryId}:${field}`;
    const existing = writeTimersRef.current.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      writeTimersRef.current.delete(key);
      serverCall().catch(async (err) => {
        setError(err instanceof Error ? err.message : errorLabel);
        try {
          const real = await categoryActions.fetchCategory(categoryId);
          if (real) dispatch(upsertCategory(real));
        } catch {
          // Recovery fetch failed too — leave the optimistic value alone and
          // let the user see the error banner.
        }
      });
    }, SERVER_DEBOUNCE_MS);

    writeTimersRef.current.set(key, timer);
  };

  const handleRename = (name: string) => {
    if (!selected) return;
    dispatch(upsertCategory({ ...selected, name }));
    setError(null);
    scheduleWrite(
      selected.id,
      "name",
      () => categoryActions.updateCategory(selected.id, { name }),
      "Failed to rename",
    );
  };

  const handleChangeColor = (color: string) => {
    if (!selected) return;
    dispatch(upsertCategory({ ...selected, color }));
    setError(null);
    scheduleWrite(
      selected.id,
      "color",
      () => categoryActions.updateCategory(selected.id, { color }),
      "Failed to update color",
    );
  };

  const handleChangeParent = (parentId: string | null) => {
    if (!selected) return;
    dispatch(upsertCategory({ ...selected, parentId }));
    setError(null);
    scheduleWrite(
      selected.id,
      "parentId",
      () => categoryActions.moveCategory(selected.id, parentId),
      "Failed to move area",
    );
  };

  const handleChangeLocation = (locationId: string | null) => {
    if (!selected) return;
    dispatch(upsertCategory({ ...selected, locationId }));
    setError(null);
    scheduleWrite(
      selected.id,
      "locationId",
      () => categoryActions.updateCategory(selected.id, { locationId }),
      "Failed to update location",
    );
  };

  const handleToggleStrict = () => {
    if (!selected) return;
    const next = !selected.isStrict;
    dispatch(upsertCategory({ ...selected, isStrict: next }));
    setError(null);
    scheduleWrite(
      selected.id,
      "isStrict",
      () => categoryActions.updateCategory(selected.id, { isStrict: next }),
      "Failed to toggle strict",
    );
  };

  const handleToggleUseTimeWindows = () => {
    if (!selected) return;
    const next = !selected.useTimeWindows;
    dispatch(upsertCategory({ ...selected, useTimeWindows: next }));
    setError(null);
    scheduleWrite(
      selected.id,
      "useTimeWindows",
      () =>
        categoryActions.updateCategory(selected.id, { useTimeWindows: next }),
      "Failed to toggle time windows",
    );
  };

  const handleConfirmDelete = () => {
    if (!deletingId) return;
    const victim = categories.find((c) => c.id === deletingId);
    if (!victim) {
      setDeletingId(null);
      return;
    }
    setError(null);
    dispatch(removeCategory(deletingId));
    if (effectiveSelectedId === deletingId) {
      const remaining = categories.filter((c) => c.id !== deletingId);
      setSelectedId(remaining.find((c) => !c.parentId)?.id ?? null);
    }
    setDeletingId(null);
    categoryActions.deleteCategory(victim.id).catch((err) => {
      dispatch(upsertCategory(victim));
      setError(err instanceof Error ? err.message : "Failed to delete area");
    });
  };

  const handleCreate = () => {
    setError(null);
    const swatch = SWATCH_PALETTE[categories.length % SWATCH_PALETTE.length];
    // Provisional shape that satisfies the Category contract well enough for
    // rendering; the server returns the canonical row (real id, timestamps) and
    // we swap it in. Using a temp id lets us re-key on success without losing
    // the selection.
    const tempId = `tmp-${Date.now()}`;
    const now = new Date().toISOString();
    const provisional: Category = {
      id: tempId,
      name: "New area",
      icon: null,
      color: swatch,
      sortOrder: categories.length,
      isStrict: false,
      useTimeWindows: false,
      locationId: null,
      parentId: null,
      userId: "",
      timeSlots: [],
      createdAt: now,
      updatedAt: now,
    };
    dispatch(upsertCategory(provisional));
    setSelectedId(tempId);

    categoryActions
      .createCategory({ name: provisional.name, color: swatch })
      .then((created) => {
        // Replace the temp row with the real one. Selection follows.
        dispatch(removeCategory(tempId));
        dispatch(upsertCategory(created));
        setSelectedId((prev) => (prev === tempId ? created.id : prev));
      })
      .catch((err) => {
        dispatch(removeCategory(tempId));
        setSelectedId((prev) => (prev === tempId ? null : prev));
        setError(err instanceof Error ? err.message : "Failed to create area");
      });
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
    ? categories.find((c) => c.id === deletingId)?.name ?? "this area"
    : "";

  return (
    <div className={page}>
      <div className={subHeader}>
        <h1 className={pageTitle}>Life Areas</h1>
        <span className={titleSummary}>
          {categories.length} area{categories.length === 1 ? "" : "s"} ·{" "}
          {planner.filter((i) => !i.parentId && i.categoryId).length} categorized
        </span>
        <span className={spacer} />
        <div className={actionCluster}>
          <Button variant="solid" size="sm" onClick={handleCreate}>
            <Plus size={13} strokeWidth={2.4} />
            New area
          </Button>
        </div>
      </div>

      {error && <div className={errorBanner}>{error}</div>}

      <div className={mainGrid}>
        <aside className={rail}>
          <div className={railHead}>Areas</div>
          <div className={railBody}>
            {tree.length === 0 ? (
              <div
                style={{
                  padding: "12px 8px",
                  fontSize: 12.5,
                  color: "var(--muted)",
                }}
              >
                No areas yet — create one.
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
                />
              ))
            )}
          </div>
          <div className={railFooter}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreate}
              style={{ width: "100%", justifyContent: "flex-start" }}
            >
              <Plus size={12} strokeWidth={2.2} />
              New top-level area
            </Button>
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
              Pick an area from the left, or create a new one to begin.
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
        title="Delete area?"
        tone="danger"
        confirmLabel="Delete"
        body={
          <>
            <p style={{ margin: 0 }}>
              Delete &ldquo;{deletingName}&rdquo;? This also deletes all
              sub-areas. Items in this area become uncategorized.
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
}: {
  node: CategoryNode;
  depth: number;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  counts: Map<string, number>;
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
          />
        ))}
    </>
  );
}
