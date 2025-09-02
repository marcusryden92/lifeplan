import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";
import EventColorPicker from "./EventColorPicker/EventColorPicker";
import { EventImpl } from "@fullcalendar/core/internal";
import usePopoverPosition from "@/hooks/usePopoverPosition";
import useClickOutside from "@/hooks/useClickOutside";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts";
import useTitleEditor from "@/hooks/useTitleEditor";
import { handleEventCopy } from "@/utils/calendarEventHandlers";
import React from "react";
import { useCalendarProvider } from "@/context/CalendarProvider";

const formatTime = (date: Date) => {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

interface EventPopoverProps {
  event: EventImpl;
  eventRect: DOMRect;
  startTime: Date;
  endTime: Date;
  isCompleted: boolean;
  displayPostponeButton: boolean;
  onClose: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onPostpone: () => void;
  setShowPopover: React.Dispatch<React.SetStateAction<boolean>>;
}

const EventPopover: React.FC<EventPopoverProps> = ({
  event,
  eventRect,
  startTime,
  endTime,
  isCompleted,
  displayPostponeButton,
  onClose,
  onDelete,
  onComplete,
  onPostpone,
  setShowPopover,
}) => {
  const { updateAll } = useCalendarProvider();

  // Popover dimensions
  const POPOVER_WIDTH = 280;
  const POPOVER_HEIGHT = 300;

  // Custom hooks
  const { position, isPositioned, isDragging, popoverRef, handleMouseDown } =
    usePopoverPosition({
      eventRect,
      dimensions: { width: POPOVER_WIDTH, height: POPOVER_HEIGHT },
      padding: 16,
    });

  const {
    isEditing,
    title,
    setTitle,
    inputRef,
    startEditing,
    handleSave,
    handleCancel,
    handleKeyDown,
    handleBlur,
  } = useTitleEditor({
    event: event,
  });

  // Handle click outside - save title if editing, then close
  useClickOutside({
    ref: popoverRef,
    onClickOutside: () => {
      if (isEditing) {
        handleSave();
      }
      onClose();
    },
  });

  // Handle keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: {
      Escape: isEditing ? handleCancel : onClose,
    },
  });

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    // Don't allow dragging when editing title
    if (!isEditing) {
      handleMouseDown(e);
    }
  };

  const onCopy = () => {
    setShowPopover(false);
    handleEventCopy(event, updateAll);
  };

  // Use portal to render the popover at the root level of the DOM
  return createPortal(
    <div
      ref={popoverRef}
      className="fixed bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-md z-50 overflow-hidden"
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
      onMouseDown={handleHeaderMouseDown}
    >
      {/* Header - Notion-style clean header */}
      <div
        className="flex justify-between items-center popover-header p-3"
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          borderBottom: "1px solid #EAEAEA",
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="font-medium text-gray-800 bg-gray-50 px-1 py-0.5 rounded border border-gray-300 focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:outline-none w-full"
          />
        ) : (
          <div
            className="flex items-center cursor-text group w-full"
            onClick={startEditing}
          >
            <h3 className="font-medium text-gray-800 truncate max-w-xs group-hover:text-sky-600">
              {title}
            </h3>
            {
              <button
                className="ml-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing();
                }}
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            }
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

        {/* Actions - Notion-style minimal buttons */}
        <div className="space-y-2">
          {/* Main action buttons */}
          <EventColorPicker taskId={event.id} />
          <div className="flex flex-wrap gap-2">
            {event.extendedProps.itemType !== "task" &&
              event.extendedProps.itemType !== "goal" && (
                <button
                  onClick={onCopy}
                  className="flex items-center text-sm text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                >
                  <DocumentDuplicateIcon className="h-4 w-4 mr-1.5 text-gray-500" />
                  Duplicate
                </button>
              )}

            <button
              onClick={onDelete}
              className="flex items-center text-sm text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
            >
              <TrashIcon className="h-4 w-4 mr-1.5 text-gray-500" />
              Delete
            </button>
          </div>

          {/* Status buttons - Only show if applicable */}
          {!event.extendedProps.isTemplateItem &&
            (event.extendedProps.itemType === "goal" ||
              event.extendedProps.itemType === "task") && (
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
