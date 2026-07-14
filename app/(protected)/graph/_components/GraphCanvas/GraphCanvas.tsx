"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { X } from "lucide-react";
import type { Category, Planner, PlannerDependency, Queue } from "@/types/prisma";
import type { WeekDayIntegers } from "@/types/calendarTypes";
import { CategoryDot, useTheme, vars, categoryColor } from "@/components/ui";
import { getEffectiveCategoryId } from "@/utils/goalPageHandlers";
import { wouldCreateCycleAddingDependency } from "@/utils/precedence/findCycle";
import { describeCycle } from "@/utils/precedence/describeCycle";
import type { PrecedenceEdge } from "@/utils/precedence/types";
import { formatDurationCompact } from "@/utils/timeFormatting";
import {
  buildGraphTicks,
  type GraphLane,
  type GraphLayout,
  type GraphTickUnit,
  type GraphTickUnits,
  type LaidLane,
  type LaidNode,
} from "../../_lib/graphModel";
import {
  scroller,
  AXIS_HEIGHT,
  axis,
  axisTick,
  axisDockLabel,
  content,
  svgLayer,
  edgeHit,
  lane as laneClass,
  laneHead,
  laneQueueCaption,
  laneTitle,
  laneCount,
  emptyLaneNote,
  node as nodeClass,
  nodeLink,
  nodeTitle,
  nodeInitial,
  nodeHint,
  nodeNameBadge,
  nodeNameBadgeTitle,
  nodeNameBadgeMeta,
  linkHandleOut,
  linkHandleIn,
  linkReasonChip,
  edgeChip,
  edgeChipLabel,
  edgeChipRemove,
} from "./GraphCanvas.css";

type DragZone = "before" | "after";

type LinkDirection = "forward" | "backward";

type LinkDragState = {
  sourceId: string;
  direction: LinkDirection;
  pointerX: number;
  pointerY: number;
  targetId: string | null;
  valid: boolean;
  reason: string | null;
  cycle: PrecedenceEdge[] | null;
};

type EdgeGeometry = {
  key: string;
  kind: "dependency" | "chain";
  edge: PlannerDependency | null;
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  path: string;
  broken: boolean;
};

type GraphCanvasProps = {
  layout: GraphLayout;
  weekStartDay: WeekDayIntegers;
  markers: GraphTickUnits;
  planner: Planner[];
  queues: Queue[];
  dependencies: PlannerDependency[];
  categories: Category[];
  queueCategoryByRootId: Map<string, string>;
  onAddDependency: (predecessorId: string, successorId: string) => void;
  onRemoveDependency: (edgeId: string) => void;
  onReorderMember: (
    queueId: string,
    plannerId: string,
    toIndex: number,
  ) => void;
  onLinkRefused: (message: string) => void;
  hoverLabels: boolean;
  onZoomDelta: (delta: number) => void;
};

// Titles render as much as fits (ellipsis-truncated). Below TITLE_MIN_WIDTH
// even a truncated title is unreadable, so the first letter stands in while
// the zoom keeps the node tall enough; the hover badge always carries the
// full name.
const TITLE_MIN_WIDTH = 40;
const TITLE_TIGHT_PAD_WIDTH = 72;
const INITIAL_MIN_NODE_HEIGHT = 22;

const TICK_LINE_OPACITY: Record<GraphTickUnit, number> = {
  month: 0.9,
  week: 0.6,
  day: 0.4,
  hour: 0.2,
};

const edgePath = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  direction: 1 | -1 = 1,
): string => {
  const dx = Math.max(28, Math.abs(x2 - x1) / 2) * direction;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
};

// A successor placed before its predecessor's end — the engine's loud
// broken-sequence fallback, rendered as a dashed error connector.
const isBroken = (from: LaidNode, to: LaidNode): boolean =>
  !!from.node.span &&
  !!to.node.span &&
  to.node.span.start < from.node.span.end - 60_000;

export function GraphCanvas({
  layout,
  weekStartDay,
  markers,
  planner,
  queues,
  dependencies,
  categories,
  queueCategoryByRootId,
  onAddDependency,
  onRemoveDependency,
  onReorderMember,
  onLinkRefused,
  hoverLabels,
  onZoomDelta,
}: GraphCanvasProps) {
  const { dark } = useTheme();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const onZoomDeltaRef = useRef(onZoomDelta);
  onZoomDeltaRef.current = onZoomDelta;
  const nodeH = layout.nodeHeight;

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [linkDrag, setLinkDrag] = useState<LinkDragState | null>(null);
  const [reorderDraggedId, setReorderDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{
    id: string;
    zone: DragZone;
  } | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);

  // First mount anchors on "now"; zoom changes keep a fixed time under the
  // anchor point — the cursor for ctrl+wheel zooms, the viewport center
  // otherwise, except pinned to the domain start while the viewport touches
  // the far left (domainStart is zoom-independent, so x scales linearly).
  const prevPxPerDayRef = useRef<number | null>(null);
  const zoomAnchorRef = useRef<number | null>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const prev = prevPxPerDayRef.current;
    prevPxPerDayRef.current = layout.pxPerDay;
    if (prev === null) {
      el.scrollLeft = Math.max(
        0,
        layoutRef.current.nowX - el.clientWidth * 0.2,
      );
      return;
    }
    if (prev === layout.pxPerDay) return;
    const anchor =
      zoomAnchorRef.current ?? (el.scrollLeft <= 0 ? 0 : el.clientWidth / 2);
    zoomAnchorRef.current = null;
    const ratio = layout.pxPerDay / prev;
    el.scrollLeft = Math.max(0, (el.scrollLeft + anchor) * ratio - anchor);
  }, [layout.pxPerDay]);

  // Wheel remap: plain wheel pans the timeline, shift+wheel scrolls
  // vertically, ctrl/meta+wheel (and trackpad pinch) zooms at the cursor.
  // Attached natively — React root wheel listeners are passive, so
  // preventDefault would be ignored there.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const scale = e.deltaMode === 1 ? 16 : 1;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomAnchorRef.current = e.clientX - el.getBoundingClientRect().left;
        onZoomDeltaRef.current(-e.deltaY * scale * 0.06);
        return;
      }
      if (e.shiftKey) {
        e.preventDefault();
        el.scrollTop += (e.deltaY !== 0 ? e.deltaY : e.deltaX) * scale;
        return;
      }
      e.preventDefault();
      el.scrollLeft += (e.deltaY + e.deltaX) * scale;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setViewportHeight(el.clientHeight),
    );
    observer.observe(el);
    setViewportHeight(el.clientHeight);
    return () => observer.disconnect();
  }, []);

  // Hour ticks are generated only inside a window around the viewport;
  // quantized to 1000px steps so scrolling rarely produces a new window value.
  const [tickWindow, setTickWindow] = useState<{
    start: number;
    end: number;
  } | null>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      const start = Math.max(
        0,
        Math.floor((el.scrollLeft - 2000) / 1000) * 1000,
      );
      const end = Math.ceil((el.scrollLeft + el.clientWidth + 2000) / 1000) * 1000;
      setTickWindow((prev) =>
        prev && prev.start === start && prev.end === end
          ? prev
          : { start, end },
      );
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    return () => el.removeEventListener("scroll", update);
  }, []);

  const ticks = useMemo(
    () =>
      buildGraphTicks(
        layout,
        weekStartDay,
        markers,
        tickWindow ?? { start: 0, end: 6000 },
      ),
    [layout, weekStartDay, markers, tickWindow],
  );

  const contentHeight = Math.max(
    layout.height,
    viewportHeight - AXIS_HEIGHT,
  );

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const laneColorByKey = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const laidLane of layout.lanes) {
      const queue = laidLane.lane.queue;
      if (!queue) {
        map.set(laidLane.lane.key, null);
        continue;
      }
      const category = queue.categoryId
        ? categoryById.get(queue.categoryId)
        : undefined;
      map.set(laidLane.lane.key, queue.color ?? category?.color ?? null);
    }
    return map;
  }, [layout, categoryById]);

  const accentById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const laid of layout.nodeById.values()) {
      const row = laid.node.planner;
      let color: string | null = row.color ?? null;
      if (!color) {
        const categoryId = getEffectiveCategoryId(
          planner,
          row.id,
          queueCategoryByRootId,
        );
        const category = categoryId ? categoryById.get(categoryId) : undefined;
        if (category) color = categoryColor(category, dark ? "dark" : "light");
      }
      map.set(row.id, color);
    }
    return map;
  }, [layout, planner, categoryById, queueCategoryByRootId, dark]);

  // Queue order reads implicitly (lane membership + left-to-right time), so
  // healthy chains draw nothing — only an out-of-order pair gets a connector.
  const edges = useMemo<EdgeGeometry[]>(() => {
    const result: EdgeGeometry[] = [];
    for (const laidLane of layout.lanes) {
      if (!laidLane.lane.queue) continue;
      const ordered = laidLane.lane.nodes;
      for (let i = 1; i < ordered.length; i++) {
        const from = layout.nodeById.get(ordered[i - 1].id);
        const to = layout.nodeById.get(ordered[i].id);
        if (!from || !to || !isBroken(from, to)) continue;
        const x1 = from.x + from.w;
        const y1 = from.y + nodeH / 2;
        const x2 = to.x;
        const y2 = to.y + nodeH / 2;
        result.push({
          key: `chain:${from.node.id}:${to.node.id}`,
          kind: "chain",
          edge: null,
          fromId: from.node.id,
          toId: to.node.id,
          x1,
          y1,
          x2,
          y2,
          path: edgePath(x1, y1, x2, y2),
          broken: true,
        });
      }
    }
    for (const edge of dependencies) {
      const from = layout.nodeById.get(edge.predecessorId);
      const to = layout.nodeById.get(edge.successorId);
      if (!from || !to) continue;
      const x1 = from.x + from.w;
      const y1 = from.y + nodeH / 2;
      const x2 = to.x;
      const y2 = to.y + nodeH / 2;
      result.push({
        key: `dependency:${edge.id}`,
        kind: "dependency",
        edge,
        fromId: from.node.id,
        toId: to.node.id,
        x1,
        y1,
        x2,
        y2,
        path: edgePath(x1, y1, x2, y2),
        broken: isBroken(from, to),
      });
    }
    return result;
  }, [layout, dependencies]);

  const selectedEdge = useMemo(
    () =>
      selectedEdgeId
        ? edges.find((e) => e.edge?.id === selectedEdgeId) ?? null
        : null,
    [edges, selectedEdgeId],
  );

  const toContentPoint = (e: { clientX: number; clientY: number }) => {
    const el = contentRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hitTestNode = (x: number, y: number): LaidNode | null => {
    for (const laid of layout.nodeById.values()) {
      if (
        x >= laid.x &&
        x <= laid.x + laid.w &&
        y >= laid.y &&
        y <= laid.y + nodeH
      ) {
        return laid;
      }
    }
    return null;
  };

  // Direction resolves who is the predecessor: dragging from the front
  // (right handle) makes the source the predecessor; from the back (left
  // handle) the drop target becomes the predecessor.
  const orderEndpoints = (
    sourceId: string,
    targetId: string,
    direction: LinkDirection,
  ): { predecessorId: string; successorId: string } =>
    direction === "forward"
      ? { predecessorId: sourceId, successorId: targetId }
      : { predecessorId: targetId, successorId: sourceId };

  const evaluateLinkTarget = (
    sourceId: string,
    targetId: string,
    direction: LinkDirection,
  ): { valid: boolean; reason: string | null; cycle: PrecedenceEdge[] | null } => {
    const target = layout.nodeById.get(targetId)?.node;
    if (!target) return { valid: false, reason: null, cycle: null };
    if (target.completed) {
      return { valid: false, reason: "Already completed", cycle: null };
    }
    const linked = dependencies.some(
      (d) =>
        (d.predecessorId === sourceId && d.successorId === targetId) ||
        (d.predecessorId === targetId && d.successorId === sourceId),
    );
    if (linked) return { valid: false, reason: "Already linked", cycle: null };
    const { predecessorId, successorId } = orderEndpoints(
      sourceId,
      targetId,
      direction,
    );
    const cycle = wouldCreateCycleAddingDependency(
      queues,
      dependencies,
      predecessorId,
      successorId,
      planner,
    );
    if (cycle) return { valid: false, reason: "Would create a loop", cycle };
    return { valid: true, reason: null, cycle: null };
  };

  const handleLinkMove = (e: React.PointerEvent) => {
    if (!linkDrag) return;
    const point = toContentPoint(e);
    const hit = hitTestNode(point.x, point.y);
    const targetId =
      hit && hit.node.id !== linkDrag.sourceId ? hit.node.id : null;
    if (targetId === linkDrag.targetId) {
      setLinkDrag({ ...linkDrag, pointerX: point.x, pointerY: point.y });
      return;
    }
    if (!targetId) {
      setLinkDrag({
        ...linkDrag,
        pointerX: point.x,
        pointerY: point.y,
        targetId: null,
        valid: false,
        reason: null,
        cycle: null,
      });
      return;
    }
    const verdict = evaluateLinkTarget(
      linkDrag.sourceId,
      targetId,
      linkDrag.direction,
    );
    setLinkDrag({
      ...linkDrag,
      pointerX: point.x,
      pointerY: point.y,
      targetId,
      ...verdict,
    });
  };

  const handleLinkUp = () => {
    if (linkDrag?.targetId) {
      if (linkDrag.valid) {
        const { predecessorId, successorId } = orderEndpoints(
          linkDrag.sourceId,
          linkDrag.targetId,
          linkDrag.direction,
        );
        onAddDependency(predecessorId, successorId);
      } else if (linkDrag.cycle) {
        onLinkRefused(
          `That link would create a loop: ${describeCycle(linkDrag.cycle, planner, queues)}`,
        );
      }
    }
    setLinkDrag(null);
  };

  const beginLink = (
    e: React.PointerEvent<HTMLButtonElement>,
    sourceId: string,
    direction: LinkDirection,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = toContentPoint(e);
    setLinkDrag({
      sourceId,
      direction,
      pointerX: point.x,
      pointerY: point.y,
      targetId: null,
      valid: false,
      reason: null,
      cycle: null,
    });
  };

  const endReorder = () => {
    setReorderDraggedId(null);
    setDragOver(null);
  };

  const handleReorderDrop = (
    graphLane: GraphLane,
    targetId: string,
    zone: DragZone,
  ) => {
    const sourceId = reorderDraggedId;
    endReorder();
    if (!sourceId || sourceId === targetId || !graphLane.queue) return;
    const without = graphLane.memberOrderRows.filter((p) => p.id !== sourceId);
    const targetIdx = without.findIndex((p) => p.id === targetId);
    if (targetIdx === -1) return;
    onReorderMember(
      graphLane.queue.id,
      sourceId,
      zone === "before" ? targetIdx : targetIdx + 1,
    );
  };

  const nodeMeta = (laid: LaidNode): string => {
    const row = laid.node.planner;
    const parts = laid.node.span
      ? [
          `${format(laid.node.span.start, "MMM d, HH:mm")} – ${format(laid.node.span.end, "MMM d, HH:mm")}`,
        ]
      : [laid.node.unreadyGoal ? "not ready" : "not scheduled"];
    if (row.duration > 0) parts.push(formatDurationCompact(row.duration));
    return parts.join(" · ");
  };

  const edgeStroke = (edge: EdgeGeometry): React.CSSProperties => {
    const active =
      edge.edge?.id === selectedEdgeId ||
      (hoveredNodeId !== null &&
        (edge.fromId === hoveredNodeId || edge.toId === hoveredNodeId));
    if (edge.kind === "chain") {
      return {
        stroke: vars.status.error,
        strokeOpacity: active ? 0.85 : 0.65,
        strokeWidth: 1.5,
        strokeDasharray: "4 3",
        fill: "none",
      };
    }
    return {
      stroke: edge.broken
        ? vars.status.error
        : active
          ? vars.accent.primary
          : vars.muted,
      strokeOpacity: active ? 1 : 0.65,
      strokeWidth: active ? 2 : 1.5,
      strokeDasharray: edge.broken ? "4 3" : undefined,
      fill: "none",
    };
  };

  const arrowFill = (edge: EdgeGeometry): React.CSSProperties => {
    const style = edgeStroke(edge);
    return { fill: style.stroke as string, fillOpacity: style.strokeOpacity };
  };

  const renderNode = (laidLane: LaidLane, laid: LaidNode) => {
    const graphLane = laidLane.lane;
    const isQueueMember = !!graphLane.queue;
    const nodeDraggable = isQueueMember && !laid.node.completed;
    const accent = accentById.get(laid.node.id) ?? null;
    const dropZone = dragOver?.id === laid.node.id ? dragOver.zone : null;
    const showInlineTitle = laid.w >= TITLE_MIN_WIDTH;
    const showInitial = !showInlineTitle && nodeH >= INITIAL_MIN_NODE_HEIGHT;
    const fontSize = nodeH >= 22 ? 12 : 10;
    const sameLaneDrag =
      reorderDraggedId !== null &&
      graphLane.nodes.some((n) => n.id === reorderDraggedId);

    return (
      <div
        key={laid.node.id}
        className={nodeClass}
        style={{
          left: laid.x,
          top: laid.y - laidLane.y,
          width: laid.w,
          height: nodeH,
          borderLeft: accent ? `3px solid ${accent}` : undefined,
        }}
        data-completed={laid.node.completed || undefined}
        data-docked={laid.docked || undefined}
        data-dragging={reorderDraggedId === laid.node.id || undefined}
        data-drag-over={dropZone ?? undefined}
        data-link-target={
          linkDrag?.targetId === laid.node.id
            ? linkDrag.valid
              ? "valid"
              : "invalid"
            : undefined
        }
        draggable={nodeDraggable}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", laid.node.id);
          setReorderDraggedId(laid.node.id);
        }}
        onDragEnd={endReorder}
        onDragOver={(e) => {
          if (!sameLaneDrag) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (reorderDraggedId === laid.node.id) {
            if (dragOver?.id === laid.node.id) setDragOver(null);
            return;
          }
          const rect = e.currentTarget.getBoundingClientRect();
          const zone: DragZone =
            e.clientX - rect.left < rect.width / 2 ? "before" : "after";
          if (dragOver?.id !== laid.node.id || dragOver.zone !== zone) {
            setDragOver({ id: laid.node.id, zone });
          }
        }}
        onDragLeave={(e) => {
          const next = e.relatedTarget as Node | null;
          if (next && e.currentTarget.contains(next)) return;
          if (dragOver?.id === laid.node.id) setDragOver(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (reorderDraggedId && dragOver && reorderDraggedId !== laid.node.id) {
            handleReorderDrop(graphLane, laid.node.id, dragOver.zone);
          } else {
            endReorder();
          }
        }}
        onMouseEnter={(e) => {
          setHoveredNodeId(laid.node.id);
          setHoverX(toContentPoint(e).x);
        }}
        onMouseMove={(e) => {
          if (hoverLabels && !linkDrag && !reorderDraggedId) {
            setHoverX(toContentPoint(e).x);
          }
        }}
        onMouseLeave={() =>
          setHoveredNodeId((prev) => (prev === laid.node.id ? null : prev))
        }
      >
        <Link
          href={`/items/${laid.node.id}`}
          className={nodeLink}
          draggable={false}
          aria-label={laid.node.planner.title || "Untitled"}
          style={
            showInitial
              ? { padding: 0, justifyContent: "center", fontSize }
              : laid.w < TITLE_TIGHT_PAD_WIDTH
                ? { padding: "0 5px", fontSize }
                : { fontSize }
          }
        >
          {showInlineTitle && (
            <span className={nodeTitle}>
              {laid.node.planner.title || "Untitled"}
            </span>
          )}
          {showInitial && (
            <span className={nodeInitial}>
              {(laid.node.planner.title || "?").trim().charAt(0).toUpperCase()}
            </span>
          )}
          {showInlineTitle && laid.docked && (
            <span className={nodeHint}>
              {laid.node.unreadyGoal ? "not ready" : "not scheduled"}
            </span>
          )}
        </Link>
        {!laid.node.completed && (
          <>
            <button
              type="button"
              className={linkHandleIn}
              aria-label={`Schedule "${laid.node.planner.title || "Untitled"}" after another item — drag to it`}
              onPointerDown={(e) => beginLink(e, laid.node.id, "backward")}
              onPointerMove={handleLinkMove}
              onPointerUp={handleLinkUp}
              onPointerCancel={() => setLinkDrag(null)}
              onDragStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
            <button
              type="button"
              className={linkHandleOut}
              aria-label={`Schedule another item after "${laid.node.planner.title || "Untitled"}" — drag to it`}
              onPointerDown={(e) => beginLink(e, laid.node.id, "forward")}
              onPointerMove={handleLinkMove}
              onPointerUp={handleLinkUp}
              onPointerCancel={() => setLinkDrag(null)}
              onDragStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          </>
        )}
      </div>
    );
  };

  const linkSource = linkDrag ? layout.nodeById.get(linkDrag.sourceId) : null;
  const hoveredLaid =
    hoverLabels && hoveredNodeId && !linkDrag && !reorderDraggedId
      ? layout.nodeById.get(hoveredNodeId) ?? null
      : null;

  const badgeRef = useRef<HTMLSpanElement>(null);
  const [badgeWidth, setBadgeWidth] = useState(0);
  useLayoutEffect(() => {
    setBadgeWidth(badgeRef.current?.offsetWidth ?? 0);
  }, [hoveredNodeId]);

  // The badge slides with the pointer only when the node can fully contain
  // it; a narrower node keeps it statically centered underneath.
  const badgeLeft = (laid: LaidNode): number => {
    const half = badgeWidth / 2;
    const min = laid.x + half;
    const max = laid.x + laid.w - half;
    if (min >= max) return laid.x + laid.w / 2;
    return Math.min(Math.max(hoverX, min), max);
  };

  return (
    <div
      ref={scrollerRef}
      className={scroller}
      onClick={() => setSelectedEdgeId(null)}
    >
      <div className={axis} style={{ width: layout.width }}>
        {ticks
          .filter((tick) => tick.label !== "")
          .map((tick) => (
            <span
              key={`${tick.unit}:${tick.x}`}
              className={axisTick}
              style={{ left: tick.x }}
              data-emphasized={tick.unit === "month" || undefined}
            >
              {tick.label}
            </span>
          ))}
        {layout.dockX !== null && (
          <span className={axisDockLabel} style={{ left: layout.dockX }}>
            Not scheduled
          </span>
        )}
      </div>

      <div
        ref={contentRef}
        className={content}
        style={{ width: layout.width, height: contentHeight }}
      >
        <svg
          className={svgLayer}
          style={{ zIndex: 0 }}
          width={layout.width}
          height={contentHeight}
          aria-hidden
        >
          {ticks.map((tick) => (
            <line
              key={`${tick.unit}:${tick.x}`}
              x1={tick.x}
              y1={0}
              x2={tick.x}
              y2={contentHeight}
              style={{
                stroke: vars.rule,
                strokeOpacity: TICK_LINE_OPACITY[tick.unit],
              }}
            />
          ))}
          {layout.scheduleEndX !== null && (
            <>
              <rect
                x={layout.scheduleEndX}
                y={0}
                width={Math.max(0, layout.width - layout.scheduleEndX)}
                height={contentHeight}
                style={{ fill: vars.ink, fillOpacity: 0.035 }}
              />
              <line
                x1={layout.scheduleEndX}
                y1={0}
                x2={layout.scheduleEndX}
                y2={contentHeight}
                style={{
                  stroke: vars.muted,
                  strokeWidth: 1.5,
                  strokeDasharray: "6 4",
                }}
              >
                <title>End of the scheduled forecast</title>
              </line>
            </>
          )}
          {layout.lanes
            .filter((laidLane) => !laidLane.lane.headerOnly)
            .map((laidLane) => (
              <line
                key={laidLane.lane.key}
                x1={0}
                y1={laidLane.y + laidLane.height}
                x2={layout.width}
                y2={laidLane.y + laidLane.height}
                style={{ stroke: vars.rule }}
              />
            ))}
          <line
            x1={layout.nowX}
            y1={0}
            x2={layout.nowX}
            y2={contentHeight}
            style={{ stroke: vars.accent.now, strokeWidth: 1.5 }}
          />
        </svg>

        {layout.lanes.map((laidLane) => {
          const laneColor = laneColorByKey.get(laidLane.lane.key);
          return (
            <div
              key={laidLane.lane.key}
              className={laneClass}
              style={{
                height: laidLane.height,
                width: layout.width,
                background: laneColor
                  ? `color-mix(in srgb, ${laneColor} 7%, transparent)`
                  : undefined,
              }}
            >
              <div
                className={laneHead}
                style={
                  laidLane.lane.depth > 0
                    ? { paddingLeft: laidLane.lane.depth * 18 }
                    : undefined
                }
              >
                {laidLane.lane.category && (
                  <CategoryDot
                    color={categoryColor(
                      laidLane.lane.category,
                      dark ? "dark" : "light",
                    )}
                    size={7}
                  />
                )}
                <span className={laneTitle}>
                  {laidLane.lane.queue && (
                    <span className={laneQueueCaption}>{"Queue: "}</span>
                  )}
                  {laidLane.lane.title}
                </span>
                {!laidLane.lane.headerOnly && (
                  <span className={laneCount}>
                    {laidLane.nodes.length}{" "}
                    {laidLane.nodes.length === 1 ? "item" : "items"}
                  </span>
                )}
                {laidLane.lane.queue && laidLane.nodes.length === 0 && (
                  <span className={emptyLaneNote}>
                    empty — add items on the Queues page
                  </span>
                )}
              </div>
              {laidLane.nodes.map((laid) => renderNode(laidLane, laid))}
            </div>
          );
        })}

        <svg
          className={svgLayer}
          style={{ zIndex: 1 }}
          width={layout.width}
          height={contentHeight}
        >
          {edges.map((edge) => (
            <g key={edge.key}>
              <path d={edge.path} style={edgeStroke(edge)} />
              <path
                d={`M ${edge.x2} ${edge.y2} l -7 -4 l 0 8 z`}
                style={arrowFill(edge)}
              />
              {edge.kind === "dependency" && edge.edge && (
                <path
                  d={edge.path}
                  className={edgeHit}
                  style={{
                    stroke: "transparent",
                    strokeWidth: 14,
                    fill: "none",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeId(edge.edge!.id);
                  }}
                >
                  <title>Prerequisite — click to inspect or remove</title>
                </path>
              )}
            </g>
          ))}
        </svg>

        {linkDrag && linkSource && (
          <svg
            className={svgLayer}
            style={{ zIndex: 4 }}
            width={layout.width}
            height={contentHeight}
            aria-hidden
          >
            <path
              d={edgePath(
                linkDrag.direction === "forward"
                  ? linkSource.x + linkSource.w
                  : linkSource.x,
                linkSource.y + nodeH / 2,
                linkDrag.pointerX,
                linkDrag.pointerY,
                linkDrag.direction === "forward" ? 1 : -1,
              )}
              style={{
                stroke:
                  linkDrag.targetId && !linkDrag.valid
                    ? vars.status.error
                    : vars.accent.primary,
                strokeWidth: 2,
                strokeDasharray: "5 4",
                fill: "none",
              }}
            />
          </svg>
        )}

        {linkDrag?.targetId && !linkDrag.valid && linkDrag.reason && (
          <span
            className={linkReasonChip}
            style={{ left: linkDrag.pointerX + 12, top: linkDrag.pointerY + 14 }}
          >
            {linkDrag.reason}
          </span>
        )}

        {hoveredLaid && (
          <span
            ref={badgeRef}
            className={nodeNameBadge}
            style={{
              left: badgeLeft(hoveredLaid),
              top: hoveredLaid.y + nodeH + 6,
            }}
          >
            <span className={nodeNameBadgeTitle}>
              {hoveredLaid.node.planner.title || "Untitled"}
            </span>
            <span className={nodeNameBadgeMeta}>{nodeMeta(hoveredLaid)}</span>
          </span>
        )}

        {selectedEdge?.edge && (
          <div
            className={edgeChip}
            style={{
              left: (selectedEdge.x1 + selectedEdge.x2) / 2,
              top: (selectedEdge.y1 + selectedEdge.y2) / 2,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className={edgeChipLabel}>
              {layout.nodeById.get(selectedEdge.fromId)?.node.planner.title ||
                "Untitled"}{" "}
              → before →{" "}
              {layout.nodeById.get(selectedEdge.toId)?.node.planner.title ||
                "Untitled"}
            </span>
            <button
              type="button"
              className={edgeChipRemove}
              aria-label="Remove dependency"
              onClick={() => {
                onRemoveDependency(selectedEdge.edge!.id);
                setSelectedEdgeId(null);
              }}
            >
              <X size={13} strokeWidth={2.2} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
