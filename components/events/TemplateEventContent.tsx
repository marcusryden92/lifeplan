// EventContent.tsx
import { XMarkIcon } from "@heroicons/react/24/outline";

import { useRef, useState, useLayoutEffect } from "react";

import { useCalendarProvider } from "@/context/CalendarProvider";

import { EventImpl } from "@fullcalendar/core/internal";
import { EventTemplate } from "@/prisma/generated/client";

import TemplateEventPopover from "./TemplateEventPopover";

const formatTime = (date: Date) => {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

interface TemplateEventContentProps {
  event: EventImpl;
  onEditTitle: (
    updateTemplateArray: React.Dispatch<React.SetStateAction<EventTemplate[]>>,
    eventTitle: string,
    eventId: string
  ) => void;
  onCopy: () => void;
  onDelete: () => void;
  showButtons: boolean;
}

const TemplateEventContent: React.FC<TemplateEventContentProps> = ({
  event,
  onEditTitle,
  onCopy,
  onDelete,
}) => {
  const { updateTemplateArray, userSettings } = useCalendarProvider();

  const elementRef = useRef<HTMLDivElement>(null);
  const [elementHeight, setElementHeight] = useState<number>(0);
  const [elementWidth, setElementWidth] = useState<number>(0);
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [eventRect, setEventRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const parentElement = elementRef.current?.closest(
      ".fc-event"
    ) as HTMLElement;
    if (parentElement) {
      setElementHeight(parentElement.offsetHeight);
      setElementWidth(parentElement.offsetWidth);

      // Apply sky-500 border when popover is open
      if (showPopover) {
        parentElement.style.outline = "1px solid #0ea5e9"; // sky-500
        parentElement.style.outlineOffset = "0px";
        parentElement.style.zIndex = "30"; // Ensure event is above others
      } else {
        parentElement.style.outline = "none";
        parentElement.style.outlineOffset = "0";
        parentElement.style.zIndex = ""; // Reset to default
      }
    }

    if (elementHeight < 20 && parentElement) {
      parentElement.style.padding = "0px";
    }
  }, [elementHeight, showPopover]);

  const [onHover, setOnHover] = useState<boolean>(false);

  const startTime = event.start ? new Date(event.start) : new Date();
  const endTime = event.end ? new Date(event.end) : new Date();

  const red = "#ef4444";

  const handleClickDelete = () => {
    const parentElement = elementRef.current?.closest(
      ".fc-event"
    ) as HTMLElement;
    if (parentElement) {
      parentElement.style.backgroundColor = red;
      parentElement.style.border = `solid 2px ${red}`;
    }

    setTimeout(() => {
      onDelete();
    }, 500);

    setShowPopover(false);
  };

  const handleEditTitle = (newTitle: string) => {
    const id = event.id;
    onEditTitle(updateTemplateArray, newTitle, id);
    setShowPopover(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up

    // Get and store the element rect for popover positioning
    if (elementRef.current) {
      setEventRect(elementRef.current.getBoundingClientRect());
      setShowPopover(true);
    }
  };

  return (
    <div
      ref={elementRef}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        padding: "8px",
        borderRadius: userSettings.styles.events.borderRadius,
        backgroundColor: event.backgroundColor,
        borderLeft: userSettings.styles.template.event.borderLeft,
      }}
      onMouseEnter={() => setOnHover(true)}
      onMouseLeave={() => setOnHover(false)}
      onDoubleClick={handleDoubleClick}
    >
      <span className="flex gap-2 justify-between">
        <span
          style={{
            marginBottom: "auto",
            fontSize: elementHeight > 20 ? "0.8rem" : "0.5rem",
            fontWeight: "bold",
          }}
        >
          {event.title}
        </span>
        <span
          className="flex gap-2"
          style={{
            fontSize: elementHeight > 20 ? "0.8rem" : "0.5rem",
            fontWeight: "bold",
          }}
        >
          <span>{formatTime(startTime)}</span>
          <span>{formatTime(endTime)}</span>
        </span>
      </span>
      {onHover && elementHeight > 40 && elementWidth > 70 && (
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          <>
            <div
              className="m-1 ml-0"
              style={{ display: "flex", justifyContent: "flex-end" }}
            >
              <button onClick={onDelete}>
                <XMarkIcon height="1rem" width="1rem" />
              </button>
            </div>
          </>
        </div>
      )}

      {/* Render popover as a portal with its own positioning logic */}
      {showPopover && eventRect && (
        <TemplateEventPopover
          event={event}
          eventRect={eventRect}
          startTime={startTime}
          endTime={endTime}
          onClose={() => setShowPopover(false)}
          onEdit={handleEditTitle}
          onCopy={() => {
            setShowPopover(false);
            onCopy();
          }}
          onDelete={handleClickDelete}
        />
      )}
    </div>
  );
};

export default TemplateEventContent;
