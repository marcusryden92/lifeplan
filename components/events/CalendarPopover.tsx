"use client";

import { type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import usePopoverPosition from "@/hooks/usePopoverPosition";
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

  return (
    <Dialog.Root
      open
      modal={false}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        {/* Transparent backdrop blocks pointer events from reaching the
            calendar grid (drag-to-select, event clicks) while the popover is
            open. pointerDownOutside on Dialog.Content handles dismissal. */}
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 49,
            background: "transparent",
          }}
        />
        <Dialog.Content
          ref={popoverRef}
          className={`${popover({ size: "lg" })} ${calendarPopover}`}
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (onEscape) {
              e.preventDefault();
              onEscape();
            }
          }}
          onPointerDownOutside={() => {
            (onClickOutside ?? onClose)();
          }}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${width}px`,
            visibility: isPositioned ? "visible" : "hidden",
            cursor: isDragging ? "grabbing" : "auto",
          }}
        >
          {children({ startDrag, close: onClose, isDragging })}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
