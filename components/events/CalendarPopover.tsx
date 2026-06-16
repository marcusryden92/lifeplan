"use client";

import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import usePopoverPosition from "@/hooks/usePopoverPosition";
import useClickOutside from "@/hooks/useClickOutside";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts";
import { useModalStack } from "@/hooks/useModalStack";
import { popover } from "@/lib/theme";
import { calendarPopover } from "./CalendarPopover.css";

interface RenderArgs {
  startDrag: (e: React.MouseEvent) => void;
  close: () => void;
  isDragging: boolean;
}

interface CalendarPopoverProps {
  anchorRect: DOMRect;
  width: number;
  height: number;
  onClose: () => void;
  /** Fires when the user presses Escape; falls back to onClose if omitted. */
  onEscape?: () => void;
  /** Fires when click lands outside the popover; falls back to onClose. */
  onClickOutside?: () => void;
  children: (args: RenderArgs) => ReactNode;
}

export function CalendarPopover({
  anchorRect,
  width,
  height,
  onClose,
  onEscape,
  onClickOutside,
  children,
}: CalendarPopoverProps) {
  const { position, isPositioned, isDragging, popoverRef, startDrag } =
    usePopoverPosition({
      eventRect: anchorRect,
      dimensions: { width, height },
      padding: 16,
    });

  // Register with the global modal stack so floating layers opened on top of
  // the popover (dropdowns, color pickers) get to handle outside-clicks first.
  const { isTop } = useModalStack(true);

  useClickOutside({
    ref: popoverRef,
    onClickOutside: onClickOutside ?? onClose,
    isActive: isTop,
  });

  useKeyboardShortcuts({
    shortcuts: { Escape: onEscape ?? onClose },
    // Stay quiet while a child layer (e.g. an open dropdown) owns Escape.
    // The child closes itself on Escape; only after it pops the stack does
    // the popover become Escape-responsive again.
    isActive: isTop,
  });

  // The popover is portaled, so the document needs to exist. Skip on first
  // server render — there's no DOM target.
  useEffect(() => {}, []);
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Transparent backdrop blocks pointer events from reaching the calendar
          underneath so drag-to-select / event clicks can't fire while the
          popover is open. Click bubbles to document and useClickOutside fires. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 49,
          background: "transparent",
        }}
      />
      <div
        ref={popoverRef}
        className={`${popover({ size: "lg" })} ${calendarPopover}`}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${width}px`,
          visibility: isPositioned ? "visible" : "hidden",
          cursor: isDragging ? "grabbing" : "auto",
        }}
      >
        {children({ startDrag, close: onClose, isDragging })}
      </div>
    </>,
    document.body,
  );
}
