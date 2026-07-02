"use client";

import type { DiffNode } from "./diffCoachTree";
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
} from "./JsonTreeView.css";

interface JsonTreeViewProps {
  root: DiffNode | null;
}

export function JsonTreeView({ root }: JsonTreeViewProps) {
  if (!root) {
    return (
      <div className={wrap}>
        <div className={empty}>No goal loaded.</div>
      </div>
    );
  }
  return (
    <div className={wrap}>
      <TreeNode node={root} />
    </div>
  );
}

function TreeNode({ node }: { node: DiffNode }) {
  return (
    <div className={nodeBlock}>
      <div className={row[node.status]}>
        <span className={titleStyle[node.status]}>{node.title}</span>
        <span className={metaCluster}>
          {node.status === "modified" && node.changedFields.length > 0 && (
            <span className={changedFieldsStyle}>
              {node.changedFields.join(", ")}
            </span>
          )}
          {node.status !== "unchanged" && (
            <span className={statusBadge[node.status]}>
              {node.status === "added"
                ? "new"
                : node.status === "modified"
                  ? "edit"
                  : "gone"}
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
          {node.isReady && <span className={readyDot} aria-label="Ready" />}
        </span>
      </div>
      {node.children.length > 0 && (
        <div className={childrenWrap}>
          {node.children.map((child, i) => (
            <TreeNode key={child.id || `unkeyed-${i}`} node={child} />
          ))}
        </div>
      )}
    </div>
  );
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
