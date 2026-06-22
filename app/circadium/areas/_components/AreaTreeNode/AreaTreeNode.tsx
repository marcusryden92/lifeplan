"use client";

import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { CategoryNode } from "@/utils/categoryUtils";
import {
  railRow,
  railRowActive,
  railRowDot,
  railRowNoDot,
  railRowLabel,
  railRowCount,
  railRowAddChild,
  treeChevron,
  treeChevronSpacer,
} from "../../page.css";

export type DragZone = "before" | "after" | "into";

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

export function AreaTreeNode({
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
          <AreaTreeNode
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
