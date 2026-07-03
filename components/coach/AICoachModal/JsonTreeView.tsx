"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Category } from "@/types/prisma";
import { CategoryBadge, useResolvedCategoryColor } from "@/components/ui";
import { diffSubtreeHasChanges, type DiffNode } from "./diffCoachTree";
import {
  wrap,
  empty,
  nodeBlock,
  row,
  title as titleStyle,
  statusBadge,
  metaCluster,
  duration as durationStyle,
  deadline as deadlineStyle,
  metaSep,
  readyDot,
  changedFields as changedFieldsStyle,
  childrenWrap,
  goalBlock,
  goalRow,
  goalTitle,
  chevron,
} from "./JsonTreeView.css";

interface JsonForestViewProps {
  // The visible (relevance-scoped) subset of the diffed forest.
  goals: DiffNode[];
  // Goals filtered out of view; informs the empty-state copy. The show-all
  // toggle itself lives in the pane header (AICoachModal).
  hiddenCount: number;
  categories: Category[];
  focusRootId: string | null;
}

export function JsonForestView({
  goals,
  hiddenCount,
  categories,
  focusRootId,
}: JsonForestViewProps) {
  // User toggles override the computed default, which keeps reacting while a
  // proposal streams in: the focused goal and any goal with changes open up,
  // untouched goals stay collapsed.
  const [expandOverrides, setExpandOverrides] = useState<
    Record<string, boolean>
  >({});

  if (goals.length === 0) {
    return (
      <div className={wrap}>
        <div className={empty}>
          {hiddenCount > 0
            ? "Nothing in view — goals appear here as the assistant works on them, or ask it to show some."
            : "No goals yet — ask the assistant for some."}
        </div>
      </div>
    );
  }

  return (
    <div className={wrap}>
      {goals.map((goal, i) => {
        const key = goal.id || `new-${i}`;
        const expanded =
          expandOverrides[key] ??
          (goal.id === focusRootId || diffSubtreeHasChanges(goal));
        return (
          <GoalSection
            key={key}
            goal={goal}
            category={
              goal.categoryId
                ? categories.find((c) => c.id === goal.categoryId)
                : undefined
            }
            expanded={expanded}
            onToggle={() =>
              setExpandOverrides((prev) => ({ ...prev, [key]: !expanded }))
            }
          />
        );
      })}
    </div>
  );
}

interface GoalSectionProps {
  goal: DiffNode;
  category: Category | undefined;
  expanded: boolean;
  onToggle: () => void;
}

function GoalSection({ goal, category, expanded, onToggle }: GoalSectionProps) {
  const categoryColor = useResolvedCategoryColor(category);
  const hasChildren = goal.children.length > 0;
  return (
    <div className={goalBlock}>
      <button
        type="button"
        className={`${row[goal.status]} ${goalRow}`}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <ChevronRight
          size={13}
          strokeWidth={2.2}
          className={chevron}
          data-expanded={expanded ? "true" : undefined}
          style={{ visibility: hasChildren ? "visible" : "hidden" }}
        />
        <span className={`${titleStyle[goal.status]} ${goalTitle}`}>
          {goal.title}
        </span>
        <span className={metaCluster}>
          {goal.status === "modified" && goal.changedFields.length > 0 && (
            <span className={changedFieldsStyle}>
              {formatChangedFields(goal.changedFields)}
            </span>
          )}
          {goal.status !== "unchanged" && (
            <span className={statusBadge[goal.status]}>
              {statusLabel(goal.status)}
            </span>
          )}
          {category && (
            <CategoryBadge color={categoryColor}>{category.name}</CategoryBadge>
          )}
          {goal.deadline && (
            <span className={deadlineStyle}>
              {formatDeadline(goal.deadline)}
            </span>
          )}
          {goal.isReady && <span className={readyDot} aria-label="Ready" />}
        </span>
      </button>
      {expanded && hasChildren && (
        <div className={childrenWrap}>
          {goal.children.map((child, i) => (
            <TreeNode
              key={child.id || `unkeyed-${i}`}
              node={child}
              subtreeReady={!!goal.isReady}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Readiness cascades from the root — the subtree is ready or unready as one —
// so child dots derive from the goal root's state, not each node's stored
// field (which can lag mid-draft until Save stamps the cascade).
function TreeNode({
  node,
  subtreeReady,
}: {
  node: DiffNode;
  subtreeReady: boolean;
}) {
  return (
    <div className={nodeBlock}>
      <div className={row[node.status]}>
        <span className={titleStyle[node.status]}>{node.title}</span>
        <span className={metaCluster}>
          {node.status === "modified" && node.changedFields.length > 0 && (
            <span className={changedFieldsStyle}>
              {formatChangedFields(node.changedFields)}
            </span>
          )}
          {node.status !== "unchanged" && (
            <span className={statusBadge[node.status]}>
              {statusLabel(node.status)}
            </span>
          )}
          <span className={durationStyle}>
            {formatDuration(node.duration)}
          </span>
          {node.deadline && (
            <>
              <span className={metaSep}>·</span>
              <span className={deadlineStyle}>
                {formatDeadline(node.deadline)}
              </span>
            </>
          )}
          {subtreeReady && node.status !== "deleted" && (
            <span className={readyDot} aria-label="Ready" />
          )}
        </span>
      </div>
      {node.children.length > 0 && (
        <div className={childrenWrap}>
          {node.children.map((child, i) => (
            <TreeNode
              key={child.id || `unkeyed-${i}`}
              node={child}
              subtreeReady={subtreeReady}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function statusLabel(status: DiffNode["status"]): string {
  if (status === "added") return "new";
  if (status === "modified") return "edit";
  return "gone";
}

// changedFields carries the coach contract's raw field names; the pane shows
// plain words instead.
const FIELD_LABELS: Record<string, string> = {
  plannerType: "type",
  isReady: "ready",
  categoryId: "category",
};

function formatChangedFields(fields: string[]): string {
  return fields.map((f) => FIELD_LABELS[f] ?? f).join(", ");
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
