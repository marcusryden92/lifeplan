// EventPopover.tsx
import { useRef, useEffect, useState } from "react";
import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";
import { SimpleEvent } from "@prisma/client";
import { Planner } from "@prisma/client";
import EventColorPicker from "./EventColorPicker/EventColorPicker";

const formatTime = (date: Date) => {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

interface EventPopoverProps {
  event: SimpleEvent;
  task?: Planner; // Replace with your actual task type
  eventRect: DOMRect;
  startTime: Date;
  endTime: Date;
  isCompleted: boolean;
  displayPostponeButton: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onPostpone: () => void;
  onUpdateTitle?: (newTitle: string) => void;
}

type Position = {
  top: number;
  left: number;
};

type Direction = "left" | "right";

const EventPopover: React.FC<EventPopoverProps> = ({
  event,
  task,
  eventRect,
  startTime,
  endTime,
  isCompleted,
  displayPostponeButton,
  onClose,
  onCopy,
  onDelete,
  onComplete,
  onPostpone,
  onUpdateTitle,
}) => {
  if (!task) return;

  const popoverRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ top: 0, left: 0 });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(event.title);

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

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        // Save title changes if we're currently editing
        if (isEditingTitle && onUpdateTitle) {
          onUpdateTitle(titleValue);
        }

        // Then close the popover
        onClose();
      }
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
  }, [onClose, isEditingTitle, onUpdateTitle, titleValue]);

  // Handle title edit saving
  const handleTitleSave = () => {
    if (onUpdateTitle && titleValue.trim() !== "") {
      onUpdateTitle(titleValue);
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

  // Use portal to render the popover at the root level of the DOM
  return createPortal(
    <div
      ref={popoverRef}
      className="fixed bg-white shadow-lg rounded-md z-50 overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${POPOVER_WIDTH}px`,
        border: "1px solid #EAEAEA",
        maxWidth: "calc(100vw - 20px)",
        maxHeight: "calc(100vh - 20px)",
        height: "300px",
        overflowY: "auto",
        visibility: isPositioned ? "visible" : "hidden",
        cursor: isDragging ? "grabbing" : "auto",
        boxShadow:
          "0 2px 6px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)",
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header - Notion-style clean header */}
      <div
        className="flex justify-between items-center popover-header p-3"
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          borderBottom: "1px solid #EAEAEA",
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
            className="font-medium text-gray-800 bg-gray-50 px-1 py-0.5 rounded border border-gray-300 focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:outline-none w-full"
            autoFocus
          />
        ) : (
          <div
            className="flex items-center cursor-text group w-full"
            onClick={() => onUpdateTitle && setIsEditingTitle(true)}
          >
            <h3 className="font-medium text-gray-800 truncate max-w-xs group-hover:text-sky-600">
              {titleValue}
            </h3>
            {onUpdateTitle && (
              <button
                className="ml-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }}
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-0.5 transition-colors"
          aria-label="Close"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Content - Notion-style minimal content */}
      <div className="p-4">
        <div className="flex items-center text-sm text-gray-600 mb-4">
          <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
          <span>
            {formatTime(startTime)} - {formatTime(endTime)}
          </span>
        </div>

        {/*  {task?.description && (
          <div className="text-sm text-gray-600 mb-4 px-0.5">
            {task.description}
          </div>
        )}
 */}
        {/* Actions - Notion-style minimal buttons */}
        <div className="space-y-2">
          {/* Main action buttons */}
          <EventColorPicker taskId={task.id} />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onCopy}
              className="flex items-center text-sm text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
            >
              <DocumentDuplicateIcon className="h-4 w-4 mr-1.5 text-gray-500" />
              Duplicate
            </button>

            <button
              onClick={onDelete}
              className="flex items-center text-sm text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
            >
              <TrashIcon className="h-4 w-4 mr-1.5 text-gray-500" />
              Delete
            </button>
          </div>

          {/* Status buttons - Only show if applicable */}
          {!event.isTemplateItem &&
            (task?.type === "goal" || task?.type === "task") && (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={onComplete}
                    className={`flex items-center text-sm px-2 py-1 rounded transition-colors ${
                      isCompleted
                        ? "bg-gray-100 text-gray-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <CheckIcon
                      className={`h-4 w-4 mr-1.5 ${
                        isCompleted ? "text-green-500" : "text-gray-500"
                      }`}
                    />
                    {isCompleted ? "Completed" : "Mark complete"}
                  </button>

                  {displayPostponeButton && (
                    <button
                      onClick={onPostpone}
                      className="flex items-center text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded transition-colors"
                    >
                      <ClockIcon className="h-4 w-4 mr-1.5 text-gray-500" />
                      Postpone
                    </button>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EventPopover;
