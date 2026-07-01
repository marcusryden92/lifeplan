"use client";

import type { CoachNode } from "./plannerTreeToJson";
import {
  wrap,
  empty,
  nodeBlock,
  row,
  title as titleStyle,
  metaCluster,
  duration as durationStyle,
  deadline as deadlineStyle,
  metaSep,
  readyDot,
  childrenWrap,
} from "./JsonTreeView.css";

interface JsonTreeViewProps {
  root: CoachNode | null;
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

function TreeNode({ node }: { node: CoachNode }) {
  return (
    <div className={nodeBlock}>
      <div className={row}>
        <span className={titleStyle}>{node.title}</span>
        <span className={metaCluster}>
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
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} />
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
