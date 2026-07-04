"use client";

import type { Category } from "@/types/prisma";
import { CategoryDot, useResolvedCategoryColor } from "@/components/ui";
import {
  groupWindowsByCategory,
  type DiffCategorySettings,
  type DiffWindow,
  type DiffWindowsState,
} from "./diffDraftWindows";
import {
  row,
  statusBadge,
  changedFields as changedFieldsStyle,
} from "./JsonTreeView.css";
import {
  wrap,
  empty,
  categoryGroup,
  categoryHeader,
  categoryName,
  flagChip,
  dayLabel,
  timeRange,
  timeRangeDeleted,
  rowSpacer,
  metaCluster,
} from "./WindowsView.css";

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface WindowsViewProps {
  diffed: DiffWindowsState;
  categories: Category[];
}

export function WindowsView({ diffed, categories }: WindowsViewProps) {
  const groups = groupWindowsByCategory(
    diffed,
    categories.map((c) => c.id),
  );

  if (groups.length === 0) {
    return (
      <div className={wrap}>
        <div className={empty}>
          No category time windows yet — windows bound when a category&apos;s
          items may be scheduled. Ask the assistant to set some up.
        </div>
      </div>
    );
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className={wrap}>
      {groups.map((group) => (
        <div key={group.categoryId} className={categoryGroup}>
          <CategoryHeader
            category={categoryById.get(group.categoryId)}
            settings={group.settings}
          />
          {group.rows.map((window) => (
            <WindowRow key={window.id} window={window} />
          ))}
        </div>
      ))}
    </div>
  );
}

function CategoryHeader({
  category,
  settings,
}: {
  category: Category | undefined;
  settings: DiffCategorySettings | null;
}) {
  const color = useResolvedCategoryColor(category);
  return (
    <div className={categoryHeader}>
      <CategoryDot color={color} size={7} />
      <span className={categoryName}>
        {category?.name ?? "Unknown category"}
      </span>
      {settings && (
        <>
          <span
            className={flagChip}
            data-changed={
              settings.changedFlags.includes("useTimeWindows")
                ? "true"
                : undefined
            }
          >
            windows {settings.useTimeWindows ? "on" : "off"}
          </span>
          {(settings.isStrict ||
            settings.changedFlags.includes("isStrict")) && (
            <span
              className={flagChip}
              data-changed={
                settings.changedFlags.includes("isStrict") ? "true" : undefined
              }
            >
              {settings.isStrict ? "strict" : "not strict"}
            </span>
          )}
        </>
      )}
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  categoryId: "category",
  startTime: "start",
  endTime: "end",
};

function WindowRow({ window }: { window: DiffWindow }) {
  return (
    <div className={row[window.status]}>
      <span className={dayLabel}>{DAY_LABELS[window.day]}</span>
      <span
        className={window.status === "deleted" ? timeRangeDeleted : timeRange}
      >
        {window.startTime}–{window.endTime}
      </span>
      <span className={rowSpacer} />
      <span className={metaCluster}>
        {window.status === "modified" && window.changedFields.length > 0 && (
          <span className={changedFieldsStyle}>
            {window.changedFields
              .map((f) => FIELD_LABELS[f] ?? f)
              .join(", ")}
          </span>
        )}
        {window.status !== "unchanged" && (
          <span className={statusBadge[window.status]}>
            {window.status === "added"
              ? "new"
              : window.status === "modified"
                ? "edit"
                : "gone"}
          </span>
        )}
      </span>
    </div>
  );
}
