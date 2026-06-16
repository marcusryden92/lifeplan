"use client";

import { useEffect, useRef, useState } from "react";

// Module-scope stack of open floating layers, ordered by mount. Each entry is
// an opaque id assigned by useModalStack. The topmost id is the one that owns
// outside-clicks and the Escape key — older layers below are passive until the
// top closes.
let stack: string[] = [];
const subscribers = new Set<(top: string | undefined) => void>();

function notify() {
  const top = stack[stack.length - 1];
  subscribers.forEach((cb) => cb(top));
}

function push(id: string) {
  stack = [...stack, id];
  notify();
}

function pop(id: string) {
  stack = stack.filter((x) => x !== id);
  notify();
}

let counter = 0;

/**
 * Tracks a floating-layer instance in a global stack so outside-click handlers
 * can fire only for the topmost layer. Returns `isTop` — read it inside
 * click-outside / Escape handlers and bail if it's false.
 *
 * Usage:
 *   const { isTop } = useModalStack(isOpen);
 *   useEffect(() => {
 *     if (!isTop) return;
 *     // attach handlers...
 *   }, [isTop]);
 */
export function useModalStack(isOpen: boolean): { isTop: boolean } {
  const idRef = useRef<string>();
  if (!idRef.current) {
    counter += 1;
    idRef.current = `modal-${counter}`;
  }

  const [topId, setTopId] = useState<string | undefined>(
    () => stack[stack.length - 1],
  );

  useEffect(() => {
    const cb = (top: string | undefined) => setTopId(top);
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const id = idRef.current!;
    push(id);
    return () => pop(id);
  }, [isOpen]);

  return { isTop: topId === idRef.current };
}
