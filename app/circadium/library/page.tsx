"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Inbox,
  Calendar,
  CalendarDays,
  AlertTriangle,
  Target,
  Flag,
  CheckCircle2,
  Layers,
  Folder,
  MapPin,
} from "lucide-react";
import { Button, Caption, TypeBadge } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import {
  buildCategoryTree,
  getCategoryAndDescendants,
  type CategoryNode,
} from "@/utils/categoryUtils";
import type { Planner, Category } from "@/types/prisma";
import {
  page,
  subHeader,
  pageTitle,
  titleSummary,
  spacer,
  actionCluster,
  mainGrid,
  rail,
  railSection,
  railSectionHead,
  railRow,
  railRowActive,
  railRowIcon,
  railRowLabel,
  railRowCount,
  railRowCountAlert,
  treeChevron,
  treeChevronSpacer,
  treeColorDot,
  treeNoColor,
  mainCard,
  filterStrip,
  filterRow,
  searchWrap,
  searchInput,
  breadcrumb,
  breadcrumbSep,
  breadcrumbCurrent,
  tableWrap,
  tableHead,
  tableRow,
  cellTitle,
  titleText,
  cellMuted,
  cellOverdue,
  cellLocation,
  cellChevron,
  emptyState,
  emptyStateTitle,
  segmentedControl,
  segmentedThumb,
  segmentedButton,
} from "./page.css";

type SmartView =
  | "today"
  | "this-week"
  | "inbox"
  | "overdue"
  | "all-goals"
  | "all-plans"
  | "done-7d";

type Selection =
  | { kind: "all" }
  | { kind: "view"; view: SmartView }
  | { kind: "category"; id: string };

type TypeFilter = "all" | "task" | "plan" | "goal";
type StatusFilter = "all" | "ready" | "not-ready" | "completed";
type SortKey = "newest" | "deadline" | "priority";

const SMART_VIEWS: Array<{
  key: SmartView;
  label: string;
  icon: typeof Inbox;
  alert?: boolean;
}> = [
  { key: "today", label: "Today", icon: Calendar },
  { key: "this-week", label: "This week", icon: CalendarDays },
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "overdue", label: "Overdue", icon: AlertTriangle, alert: true },
  { key: "all-goals", label: "All goals", icon: Target },
  { key: "all-plans", label: "All plans", icon: Flag },
  { key: "done-7d", label: "Done · 7d", icon: CheckCircle2 },
];

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function isInSmartView(item: Planner, view: SmartView, now: Date): boolean {
  const today = startOfDay(now);
  const todayEnd = endOfDay(now);
  switch (view) {
    case "today": {
      if (!item.deadline) return false;
      const dl = new Date(item.deadline);
      return dl >= today && dl <= todayEnd && !item.completedEndTime;
    }
    case "this-week": {
      if (!item.deadline) return false;
      const weekEnd = endOfDay(new Date(today.getTime() + 6 * 86400000));
      const dl = new Date(item.deadline);
      return dl >= today && dl <= weekEnd && !item.completedEndTime;
    }
    case "inbox":
      return !item.categoryId && !item.completedEndTime;
    case "overdue": {
      if (!item.deadline || item.completedEndTime) return false;
      return new Date(item.deadline) < today;
    }
    case "all-goals":
      return item.plannerType === "goal";
    case "all-plans":
      return item.plannerType === "plan";
    case "done-7d": {
      if (!item.completedEndTime) return false;
      const cutoff = new Date(today.getTime() - 7 * 86400000);
      return new Date(item.completedEndTime) >= cutoff;
    }
  }
}

function typeBadgeTone(
  type: string,
): "type" | "info" | "done" | "neutral" {
  switch (type) {
    case "goal":
      return "done";
    case "plan":
      return "info";
    case "task":
      return "type";
    default:
      return "neutral";
  }
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Animated sliding-thumb segmented control. Matches the type picker in the
// item detail view: ink-fill thumb translates to the active index, button
// text fades from muted -> paper.
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ key: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  const n = options.length;
  const activeIdx = Math.max(
    0,
    options.findIndex((o) => o.key === value),
  );
  return (
    <div
      className={segmentedControl}
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
    >
      <span
        className={segmentedThumb}
        aria-hidden
        style={{
          width: `calc(${100 / n}% - ${6 / n}px)`,
          transform: `translateX(${activeIdx * 100}%)`,
        }}
      />
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={segmentedButton}
          data-active={o.key === value}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function LibraryPage() {
  const router = useRouter();
  const { planner, categories } = useCalendarProvider();
  const now = useMemo(() => new Date(), []);

  const [selection, setSelection] = useState<Selection>({ kind: "all" });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const rootItems = useMemo(
    () => planner.filter((i) => !i.parentId),
    [planner],
  );

  const categoryTree = useMemo(
    () => buildCategoryTree(categories),
    [categories],
  );

  const categoryIndex = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cat of categories) {
      const descendantIds = getCategoryAndDescendants(cat.id, categories);
      const set = new Set(descendantIds);
      const count = rootItems.filter(
        (i) => i.categoryId && set.has(i.categoryId),
      ).length;
      counts.set(cat.id, count);
    }
    return counts;
  }, [categories, rootItems]);

  const smartViewCounts = useMemo(() => {
    const counts: Record<SmartView, number> = {
      today: 0,
      "this-week": 0,
      inbox: 0,
      overdue: 0,
      "all-goals": 0,
      "all-plans": 0,
      "done-7d": 0,
    };
    for (const item of rootItems) {
      for (const v of SMART_VIEWS) {
        if (isInSmartView(item, v.key, now)) counts[v.key]++;
      }
    }
    return counts;
  }, [rootItems, now]);

  const filteredItems = useMemo(() => {
    let result = rootItems;

    if (selection.kind === "view") {
      result = result.filter((i) => isInSmartView(i, selection.view, now));
    } else if (selection.kind === "category") {
      const descendantIds = new Set(
        getCategoryAndDescendants(selection.id, categories),
      );
      result = result.filter(
        (i) => i.categoryId && descendantIds.has(i.categoryId),
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.title.toLowerCase().includes(q));
    }

    if (typeFilter !== "all") {
      result = result.filter((i) => i.plannerType === typeFilter);
    }

    if (statusFilter === "ready") {
      result = result.filter((i) => i.isReady && !i.completedEndTime);
    } else if (statusFilter === "not-ready") {
      result = result.filter((i) => !i.isReady && !i.completedEndTime);
    } else if (statusFilter === "completed") {
      result = result.filter((i) => i.completedEndTime);
    }

    const sorted = [...result].sort((a, b) => {
      switch (sortKey) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "deadline":
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return (
            new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          );
        case "priority":
          return b.priority - a.priority;
      }
    });

    return sorted;
  }, [
    rootItems,
    selection,
    categories,
    search,
    typeFilter,
    statusFilter,
    sortKey,
    now,
  ]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const breadcrumbPath = useMemo((): Category[] => {
    if (selection.kind !== "category") return [];
    const trail: Category[] = [];
    let cur: Category | undefined = categoryIndex.get(selection.id);
    while (cur) {
      trail.unshift(cur);
      cur = cur.parentId ? categoryIndex.get(cur.parentId) : undefined;
    }
    return trail;
  }, [selection, categoryIndex]);

  const selectionLabel = (() => {
    if (selection.kind === "all") return "All items";
    if (selection.kind === "view") {
      return SMART_VIEWS.find((v) => v.key === selection.view)?.label ?? "View";
    }
    return categoryIndex.get(selection.id)?.name ?? "Category";
  })();

  const breadcrumbCrumbs: string[] = (() => {
    if (selection.kind === "all") return ["All items"];
    if (selection.kind === "view") return [selectionLabel];
    return breadcrumbPath.map((c) => c.name);
  })();

  return (
    <div className={page}>
      <div className={subHeader}>
        <h1 className={pageTitle}>Library</h1>
        <span className={titleSummary}>
          {planner.length} items · {categories.length} categor{categories.length === 1 ? "y" : "ies"}
        </span>
        <span className={spacer} />
        <div className={actionCluster}>
          <Button variant="solid" size="sm">
            <Plus size={13} strokeWidth={2.4} />
            New item
          </Button>
        </div>
      </div>

      <div className={mainGrid}>
        <aside className={rail}>
          <div className={railSection}>
            <div className={railSectionHead}>Smart views</div>
            <button
              className={`${railRow} ${selection.kind === "all" ? railRowActive : ""}`}
              onClick={() => setSelection({ kind: "all" })}
            >
              <span className={railRowIcon}>
                <Layers size={13} strokeWidth={2} />
              </span>
              <span className={railRowLabel}>Browse all</span>
              <span className={railRowCount}>{rootItems.length}</span>
            </button>
            {SMART_VIEWS.map((v) => {
              const Icon = v.icon;
              const count = smartViewCounts[v.key];
              const active =
                selection.kind === "view" && selection.view === v.key;
              return (
                <button
                  key={v.key}
                  className={`${railRow} ${active ? railRowActive : ""}`}
                  onClick={() =>
                    setSelection({ kind: "view", view: v.key })
                  }
                >
                  <span className={railRowIcon}>
                    <Icon size={13} strokeWidth={2} />
                  </span>
                  <span className={railRowLabel}>{v.label}</span>
                  <span
                    className={`${railRowCount} ${
                      v.alert && count > 0 ? railRowCountAlert : ""
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className={railSection}>
            <div className={railSectionHead}>Categories</div>
            {categoryTree.length === 0 ? (
              <div style={{ padding: "8px", fontSize: 12.5, color: "var(--muted)" }}>
                <Caption>No areas yet</Caption>
              </div>
            ) : (
              categoryTree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  selection={selection}
                  setSelection={setSelection}
                  counts={categoryCounts}
                />
              ))
            )}
          </div>
        </aside>

        <section className={mainCard}>
          <div className={breadcrumb}>
            <span>Library</span>
            {breadcrumbCrumbs.map((label, i) => {
              const isLast = i === breadcrumbCrumbs.length - 1;
              return (
                <span
                  key={i}
                  style={{ display: "inline-flex", gap: 8, alignItems: "center" }}
                >
                  <span className={breadcrumbSep}>›</span>
                  <span className={isLast ? breadcrumbCurrent : undefined}>
                    {label}
                  </span>
                </span>
              );
            })}
          </div>

          <div className={filterStrip}>
            <div className={filterRow}>
              <Segmented<TypeFilter>
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { key: "all", label: "All" },
                  { key: "task", label: "Task" },
                  { key: "plan", label: "Plan" },
                  { key: "goal", label: "Goal" },
                ]}
              />

              <Segmented<StatusFilter>
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { key: "all", label: "All" },
                  { key: "ready", label: "Ready" },
                  { key: "not-ready", label: "Draft" },
                  { key: "completed", label: "Done" },
                ]}
              />

              <span className={spacer} />

              <Segmented<SortKey>
                value={sortKey}
                onChange={setSortKey}
                options={[
                  { key: "newest", label: "Newest" },
                  { key: "deadline", label: "Deadline" },
                  { key: "priority", label: "Priority" },
                ]}
              />
            </div>

            <div className={filterRow}>
              <div className={searchWrap}>
                <Search size={13} strokeWidth={2} style={{ color: "var(--muted)" }} />
                <input
                  className={searchInput}
                  placeholder={`Search ${selectionLabel.toLowerCase()}…`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className={emptyState}>
              <div className={emptyStateTitle}>Nothing here yet</div>
              <div>
                Try clearing filters, switching the view, or creating a new
                item.
              </div>
            </div>
          ) : (
            <div className={tableWrap}>
              <div className={tableHead}>
                <span>Title</span>
                <span>Type</span>
                <span>Duration</span>
                <span>Deadline</span>
                <span>Area</span>
                <span>Status</span>
                <span />
              </div>
              {filteredItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  category={
                    item.categoryId
                      ? categoryIndex.get(item.categoryId)
                      : undefined
                  }
                  onClick={() => router.push(`/circadium/items/${item.id}`)}
                  now={now}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  toggleExpand,
  selection,
  setSelection,
  counts,
}: {
  node: CategoryNode;
  depth: number;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  selection: Selection;
  setSelection: (s: Selection) => void;
  counts: Map<string, number>;
}) {
  const isOpen = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const active = selection.kind === "category" && selection.id === node.id;
  const count = counts.get(node.id) ?? 0;

  return (
    <>
      <button
        className={`${railRow} ${active ? railRowActive : ""}`}
        onClick={() => setSelection({ kind: "category", id: node.id })}
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
          <span
            className={treeColorDot}
            style={{ background: node.color }}
          />
        ) : (
          <span className={treeNoColor} />
        )}
        <span className={railRowLabel}>{node.name}</span>
        <span className={railRowCount}>{count}</span>
      </button>
      {hasChildren && isOpen &&
        node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            toggleExpand={toggleExpand}
            selection={selection}
            setSelection={setSelection}
            counts={counts}
          />
        ))}
    </>
  );
}

function ItemRow({
  item,
  category,
  onClick,
  now,
}: {
  item: Planner;
  category?: Category;
  onClick: () => void;
  now: Date;
}) {
  const isOverdue =
    item.deadline &&
    new Date(item.deadline) < startOfDay(now) &&
    !item.completedEndTime;

  const statusLabel = item.completedEndTime
    ? "Done"
    : item.isReady
      ? "Ready"
      : "Draft";

  return (
    <div className={tableRow} onClick={onClick} role="button">
      <div className={cellTitle}>
        <span className={titleText}>{item.title}</span>
      </div>
      <div>
        <TypeBadge tone={typeBadgeTone(item.plannerType)}>
          {item.plannerType}
        </TypeBadge>
      </div>
      <div className={cellMuted}>{formatDuration(item.duration)}</div>
      <div className={`${cellMuted} ${isOverdue ? cellOverdue : ""}`}>
        {item.deadline ? format(new Date(item.deadline), "MMM d, yyyy") : "—"}
      </div>
      <div className={cellLocation}>
        {category ? (
          <>
            {category.color && (
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: category.color,
                  flexShrink: 0,
                }}
              />
            )}
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
              {category.name}
            </span>
          </>
        ) : (
          <span style={{ color: "var(--muted)" }}>—</span>
        )}
      </div>
      <div>
        <Caption>{statusLabel}</Caption>
      </div>
      <div className={cellChevron}>
        <ChevronRight size={14} strokeWidth={2} />
      </div>
    </div>
  );
}
