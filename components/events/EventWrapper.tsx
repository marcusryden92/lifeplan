import React, { ReactNode, useLayoutEffect } from "react";
import { EventImpl } from "@fullcalendar/core/internal";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { formatTime } from "@/utils/calendarUtils";
import { handleDoubleClick } from "@/utils/calendarEventHandlers";

interface EventWrapperProps {
  event: EventImpl;
  elementRef: React.RefObject<HTMLDivElement>;
  elementHeight: number;
  isCompleted: boolean;
  showPopover: boolean;
  disableInteraction?: boolean;
  setShowPopover: React.Dispatch<React.SetStateAction<boolean>>;
  setElementHeight: React.Dispatch<React.SetStateAction<number>>;
  setElementWidth: React.Dispatch<React.SetStateAction<number>>;
  setOnHover: React.Dispatch<React.SetStateAction<boolean>>;
  setEventRect: React.Dispatch<React.SetStateAction<DOMRect | null>>;
  children?: ReactNode;
}

const EventWrapper: React.FC<EventWrapperProps> = ({
  event,
  elementRef,
  elementHeight,
  isCompleted,
  showPopover,
  disableInteraction = false,
  setShowPopover,
  setElementHeight,
  setElementWidth,
  setOnHover,
  setEventRect,
  children,
}: EventWrapperProps) => {
  const { userSettings } = useCalendarProvider();

  useLayoutEffect(() => {
    const element = elementRef.current;

    if (element) {
      setElementHeight(element.offsetHeight);
      setElementWidth(element.offsetWidth);

      // Set z-index when opening popover
      if (showPopover) {
        element.style.zIndex = "30"; // Ensure event is above others
      } else {
        element.style.zIndex = ""; // Reset to default
      }
    }
  }, [elementHeight, showPopover]);

  if (!event.start || !event.end) return null;

  const startTime = new Date(event.start);
  const endTime = new Date(event.end);

  return (
    <div
      ref={elementRef}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        padding: elementHeight < 20 ? "2px 8px" : "8px",
        borderRadius: userSettings.styles.events.borderRadius,
        backgroundColor: isCompleted
          ? userSettings.styles.events.completedColor
          : event.backgroundColor,
        borderLeft: userSettings.styles.calendar.event.borderLeft,
      }}
      onMouseEnter={() => setOnHover(true)}
      onMouseLeave={() => setOnHover(false)}
      onDoubleClick={(e) =>
        !disableInteraction &&
        handleDoubleClick(e, elementRef, setEventRect, setShowPopover)
      }
    >
      {/* Header row with title and time */}
      <span
        className="flex gap-2 justify-between"
        style={{
          borderBottom: showPopover ? "4px dotted white" : "",
        }}
      >
        <span
          style={{
            marginBottom: "auto",
            fontSize: elementHeight > 20 ? "0.7rem" : "0.5rem",
            fontWeight: "bold",
          }}
        >
          {event.title}
        </span>
        <span
          className="flex gap-2"
          style={{
            fontSize: elementHeight > 20 ? "0.7rem" : "0.5rem",
            fontWeight: "bold",
          }}
        >
          <span>{formatTime(startTime)}</span>
          <span>{formatTime(endTime)}</span>
        </span>
      </span>

      {children}
    </div>
  );
};

export default EventWrapper;
