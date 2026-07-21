"use client";

import { useCallback, useEffect, useRef } from "react";
import type { DragZone } from "./CategoryTreeNode";

const DRAG_THRESHOLD_PX = 8;
const EDGE_ZONE_PX = 12;
const AUTO_SCROLL_EDGE_PX = 48;
const AUTO_SCROLL_MAX_STEP_PX = 14;

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    )
      return node;
    node = node.parentElement;
  }
  return document.scrollingElement as HTMLElement | null;
}

function speedForDistance(distance: number): number {
  const clamped = Math.min(Math.max(distance, 0), AUTO_SCROLL_EDGE_PX);
  return Math.ceil(
    (1 - clamped / AUTO_SCROLL_EDGE_PX) * AUTO_SCROLL_MAX_STEP_PX,
  );
}

// Touch counterpart to the tree rows' HTML5 drag (which touch browsers never
// initiate). Same shape as the subtasks list's useTouchDragReorder: the grip
// captures the touch pointer, hit-testing runs through
// document.elementFromPoint against the rows' data-category-id, and the drop
// feeds the page's existing performDrop path. Zones mirror the HTML5
// onDragOver math exactly.
export function useTouchCategoryDrag({
  nodeId,
  setDraggedId,
  setDragOver,
  onTouchDrop,
}: {
  nodeId: string;
  setDraggedId: (id: string | null) => void;
  setDragOver: (s: { id: string; zone: DragZone } | null) => void;
  onTouchDrop: (sourceId: string, targetId: string, zone: DragZone) => void;
}) {
  // Window listeners bind at pointerdown; refs keep the latest props reachable
  // from those closures across re-renders.
  const onTouchDropRef = useRef(onTouchDrop);
  onTouchDropRef.current = onTouchDrop;
  const setDragOverRef = useRef(setDragOver);
  setDragOverRef.current = setDragOver;
  const setDraggedIdRef = useRef(setDraggedId);
  setDraggedIdRef.current = setDraggedId;

  const pointerIdRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const dropRef = useRef<{ id: string; zone: DragZone } | null>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const removeListenersRef = useRef<(() => void) | null>(null);

  const endGesture = useCallback(() => {
    pointerIdRef.current = null;
    draggingRef.current = false;
    removeListenersRef.current?.();
    removeListenersRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    scrollParentRef.current = null;
    dropRef.current = null;
    setDragOverRef.current(null);
    setDraggedIdRef.current(null);
  }, []);

  useEffect(
    () => () => {
      if (pointerIdRef.current !== null) endGesture();
    },
    [endGesture],
  );

  const updateDropTarget = useCallback(
    (x: number, y: number) => {
      const el = document.elementFromPoint(x, y);
      const rowEl = el?.closest<HTMLElement>("[data-category-id]");
      let next: { id: string; zone: DragZone } | null = null;
      if (rowEl && rowEl.dataset.categoryId !== nodeId) {
        const rect = rowEl.getBoundingClientRect();
        const offsetY = y - rect.top;
        let zone: DragZone;
        if (offsetY < EDGE_ZONE_PX) zone = "before";
        else if (offsetY > rect.height - EDGE_ZONE_PX) zone = "after";
        else zone = "into";
        next = { id: rowEl.dataset.categoryId as string, zone };
      }

      const prev = dropRef.current;
      const unchanged =
        prev === next ||
        (!!prev && !!next && prev.id === next.id && prev.zone === next.zone);
      if (!unchanged) {
        dropRef.current = next;
        setDragOverRef.current(next);
      }
    },
    [nodeId],
  );

  const autoScrollStep = useCallback(() => {
    const scrollParent = scrollParentRef.current;
    if (scrollParent) {
      const isRoot = scrollParent === document.scrollingElement;
      const rect = isRoot ? null : scrollParent.getBoundingClientRect();
      const top = Math.max(rect?.top ?? 0, 0);
      const bottom = Math.min(rect?.bottom ?? Infinity, window.innerHeight);
      const y = lastPointRef.current.y;

      let delta = 0;
      if (y - top < AUTO_SCROLL_EDGE_PX) {
        delta = -speedForDistance(y - top);
      } else if (bottom - y < AUTO_SCROLL_EDGE_PX) {
        delta = speedForDistance(bottom - y);
      }

      if (delta !== 0) {
        const before = scrollParent.scrollTop;
        scrollParent.scrollTop = before + delta;
        if (scrollParent.scrollTop !== before)
          updateDropTarget(lastPointRef.current.x, lastPointRef.current.y);
      }
    }
    rafRef.current = requestAnimationFrame(autoScrollStep);
  }, [updateDropTarget]);

  const onGripPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") return;
      if (pointerIdRef.current !== null) return;

      pointerIdRef.current = e.pointerId;
      draggingRef.current = false;
      const start = { x: e.clientX, y: e.clientY };
      lastPointRef.current = start;
      const gripEl = e.currentTarget as HTMLElement;

      const handleMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerIdRef.current) return;
        lastPointRef.current = { x: ev.clientX, y: ev.clientY };

        if (!draggingRef.current) {
          const dx = ev.clientX - start.x;
          const dy = ev.clientY - start.y;
          if (dx * dx + dy * dy <= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX)
            return;
          draggingRef.current = true;
          setDraggedIdRef.current(nodeId);
          scrollParentRef.current = getScrollParent(gripEl);
          rafRef.current = requestAnimationFrame(autoScrollStep);
        }
        updateDropTarget(ev.clientX, ev.clientY);
      };

      const handleUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerIdRef.current) return;
        const wasDragging = draggingRef.current;
        const target = dropRef.current;
        endGesture();
        if (!wasDragging || !target) return;
        onTouchDropRef.current(nodeId, target.id, target.zone);
      };

      const handleCancel = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerIdRef.current) return;
        endGesture();
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleCancel);
      removeListenersRef.current = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleCancel);
      };
    },
    [nodeId, updateDropTarget, autoScrollStep, endGesture],
  );

  return { onGripPointerDown };
}
