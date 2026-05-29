// TemplateEventPopover.tsx
import React, { useRef, useEffect, useState, useMemo } from "react";
import { X, Pencil, Trash2, Copy, Clock } from "lucide-react";
import { createPortal } from "react-dom";
import { EventImpl } from "@fullcalendar/core/internal";
import TemplateEventColorPicker from "./EventColorPicker/TemplateEventColorPicker";
import { formatTime } from "@/utils/calendarUtils";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { LocationSelector } from "@/components/locations/LocationSelector";
import { assignLocationToTemplate } from "@/actions/locations";
import { vars } from "@/lib/theme";

interface TemplateEventPopoverProps {
  event: EventImpl;
  eventRect: DOMRect;
  startTime: Date;
  endTime: Date;
  onClose: () => void;
  onEdit: (newTitle: string) => void;
  onCopy: () => void;
  onDelete: () => void;
}

type Position = {
  top: number;
  left: number;
};

type Direction = "left" | "right";

const TemplateEventPopover: React.FC<TemplateEventPopoverProps> = ({
  event,
  eventRect,
  startTime,
  endTime,
  onClose,
  onEdit,
  onCopy,
  onDelete,
}) => {
  const { template, updateTemplateArray } = useCalendarProvider();
  const popoverRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ top: 0, left: 0 });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState<string>(event.title || "");

  // Get the template item to find its locationId
  const templateItem = useMemo(
    () => template.find((t) => t.id === event.id),
    [template, event.id]
  );

  const handleLocationChange = async (locationId: string | null) => {
    try {
      await assignLocationToTemplate(event.id, locationId);
      // Update local state
      updateTemplateArray((prev) =>
        prev.map((t) =>
          t.id === event.id ? { ...t, locationId: locationId } : t
        )
      );
    } catch (error) {
      console.error("Failed to update template location:", error);
    }
  };

  // Popover dimensions
  const POPOVER_WIDTH = 280; // Slightly wider for better aesthetics
  const POPOVER_HEIGHT = 240; // Approximate height
  const PADDING = 16; // Minimum padding from screen edges

  // Calculate optimal position before first render to avoid flickering
  useEffect(() => {
    if (!isPositioned) {
      calculateOptimalPosition();
    }
  }, []);

  // Focus the input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Handle dragging functionality
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      setPosition({
        top: event.clientY - dragOffset.top,
        left: event.clientX - dragOffset.left,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Check if an element is inside a Radix UI portal (Select, Dialog, etc.)
  const isInsideRadixPortal = (element: Element | null): boolean => {
    let current = element;
    while (current) {
      if (
        current.hasAttribute?.("data-radix-popper-content-wrapper") ||
        current.hasAttribute?.("data-radix-select-content") ||
        current.hasAttribute?.("data-radix-menu-content") ||
        current.hasAttribute?.("data-radix-dialog-content") ||
        current.getAttribute?.("role") === "listbox" ||
        current.getAttribute?.("data-state") === "open"
      ) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Ignore clicks inside the popover
      if (popoverRef.current && popoverRef.current.contains(target)) {
        return;
      }

      // Ignore clicks on Radix portals (e.g., Select dropdown)
      if (isInsideRadixPortal(target)) {
        return;
      }

      // Save title changes if we're currently editing
      if (isEditingTitle && onEdit) {
        onEdit(titleValue);
      }

      // Then close the popover
      onClose();
    };

    // Close popover on escape key
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // If editing title, exit edit mode instead of closing popover
        if (isEditingTitle) {
          setIsEditingTitle(false);
          setTitleValue(event.title); // Reset to original value
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [onClose, isEditingTitle, onEdit, titleValue]);

  // Handle title edit saving
  const handleTitleSave = () => {
    if (onEdit && titleValue.trim() !== "") {
      onEdit(titleValue);
    }
    setIsEditingTitle(false);
  };

  // Handle title input keydown
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      setIsEditingTitle(false);
      setTitleValue(event.title); // Reset to original value
    }
  };

  // Find the optimal horizontal direction (left or right)
  const findOptimalHorizontalDirection = (): Direction => {
    const viewportWidth = window.innerWidth;

    // Calculate available space on each side
    const spaceLeft = eventRect.left - PADDING;
    const spaceRight = viewportWidth - eventRect.right - PADDING;

    // Return the direction with more space
    return spaceLeft > spaceRight ? "left" : "right";
  };

  // Calculate optimal position based on viewport and event position
  const calculateOptimalPosition = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Prioritize left or right placement depending on available space
    const horizontalDirection = findOptimalHorizontalDirection();

    let top = 0;
    let left = 0;

    // Default vertical position - centered with the event
    top = eventRect.top + eventRect.height / 2 - POPOVER_HEIGHT / 2;

    // Set horizontal position based on the chosen direction
    if (horizontalDirection === "left") {
      left = eventRect.left - POPOVER_WIDTH - 8; // 8px gap
    } else {
      // right
      left = eventRect.right + 8; // 8px gap
    }

    // Adjust vertical position if needed to keep within viewport
    if (top < PADDING) {
      top = PADDING; // Adjust if too close to top
    } else if (top + POPOVER_HEIGHT > viewportHeight - PADDING) {
      top = viewportHeight - POPOVER_HEIGHT - PADDING; // Adjust if too close to bottom
    }

    // Final safety check to ensure within viewport horizontally
    if (left < PADDING) {
      left = PADDING;
    } else if (left + POPOVER_WIDTH > viewportWidth - PADDING) {
      left = viewportWidth - POPOVER_WIDTH - PADDING;
    }

    setPosition({ top, left });
    setIsPositioned(true);
  };

  // Handle mousedown on the popover header to start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only enable dragging if clicked on the header and not editing title
    if (
      !isEditingTitle &&
      e.target instanceof Element &&
      (e.target.closest(".popover-header") ||
        e.target.classList.contains("popover-header"))
    ) {
      setIsDragging(true);

      // Calculate drag offset from the click position
      if (popoverRef.current) {
        const rect = popoverRef.current.getBoundingClientRect();
        setDragOffset({
          top: e.clientY - rect.top,
          left: e.clientX - rect.left,
        });
      }

      // Prevent text selection during drag
      e.preventDefault();
    }
  };

  return createPortal(
    <div
      ref={popoverRef}
        style={{
          position: "fixed",
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${POPOVER_WIDTH}px`,
          maxWidth: "calc(100vw - 20px)",
          maxHeight: "calc(100vh - 20px)",
          zIndex: 50,
          background: vars.glass.bgDeep,
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          border: `1px solid ${vars.glass.stroke}`,
          borderRadius: 18,
          boxShadow: vars.shadow.panel,
          overflow: "hidden",
          fontFamily: vars.font.ui,
          color: vars.ink,
          visibility: isPositioned ? "visible" : "hidden",
          cursor: isDragging ? "grabbing" : "auto",
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          className="popover-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "12px 14px",
            borderBottom: `1px solid ${vars.rule}`,
            cursor: isDragging ? "grabbing" : "grab",
          }}
        >
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              style={{
                flex: 1,
                fontFamily: vars.font.display,
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: vars.ink,
                background: vars.glass.bgSoft,
                border: `1px solid ${vars.rule}`,
                borderRadius: 6,
                padding: "4px 8px",
                outline: "none",
              }}
            />
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "text",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontFamily: vars.font.display,
                  fontSize: 17,
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  color: vars.ink,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {titleValue}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 4,
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: vars.muted,
                  cursor: "pointer",
                }}
                aria-label="Edit title"
              >
                <Pencil size={14} strokeWidth={2} />
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 4,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: vars.muted,
              cursor: "pointer",
              flexShrink: 0,
            }}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: "14px 16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
              fontSize: 12.5,
              color: vars.inkSoft,
              fontFamily: vars.font.ui,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Clock size={13} strokeWidth={2} aria-hidden style={{ color: vars.muted }} />
            <span>
              {formatTime(startTime)} – {formatTime(endTime)}
            </span>
          </div>

          {templateItem && (
            <div style={{ marginBottom: 14 }}>
              <LocationSelector
                value={templateItem.locationId ?? null}
                onChange={handleLocationChange}
                className="w-full"
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <TemplateEventColorPicker templateId={event.id} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <TplPopoverAction
                onClick={onCopy}
                icon={<Copy size={13} strokeWidth={2} />}
                label="Duplicate"
              />
              <TplPopoverAction
                onClick={onDelete}
                icon={<Trash2 size={13} strokeWidth={2} />}
                label="Delete"
              />
            </div>
          </div>
        </div>
      </div>,
    document.body,
  );
};

function TplPopoverAction({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        border: `1px solid ${vars.glass.stroke}`,
        background: vars.glass.bgDeep,
        color: vars.ink,
        fontFamily: vars.font.ui,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      <span style={{ display: "inline-flex", color: vars.muted }}>{icon}</span>
      {label}
    </button>
  );
}

export default TemplateEventPopover;
