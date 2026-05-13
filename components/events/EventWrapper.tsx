import React, { ReactNode, useLayoutEffect } from "react";
import { EventImpl } from "@fullcalendar/core/internal";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { formatTime } from "@/utils/calendarUtils";
import { handleDoubleClick } from "@/utils/calendarEventHandlers";
import {
  TRESPASS_BACKGROUND_COLOR,
  TRESPASS_BORDER_COLOR,
  TRESPASS_BORDER_WIDTH,
  getTrespassGradient,
} from "./trespassBorderStyles";

interface EventExtendedPropsWithTrespassing {
  trespassingStart?: boolean;
  trespassingEnd?: boolean;
  [key: string]: unknown;
}

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

  // Check for trespassing indicators (overlapping events with different locations)
  const extendedProps =
    event.extendedProps as EventExtendedPropsWithTrespassing;
  const trespassingStart = extendedProps?.trespassingStart ?? false;
  const trespassingEnd = extendedProps?.trespassingEnd ?? false;
  const eventBackgroundColor = isCompleted
    ? userSettings.styles.events.completedColor
    : event.backgroundColor;
  const trespassPx = `${TRESPASS_BORDER_WIDTH}px`;

  return (
    <div
      ref={elementRef}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        padding: elementHeight < 20 ? "2px 8px" : "8px",
        borderRadius: userSettings.styles.events.borderRadius,
        background: getTrespassGradient(
          trespassingStart,
          trespassingEnd,
          eventBackgroundColor,
          TRESPASS_BACKGROUND_COLOR,
        ),
        borderLeft: userSettings.styles.calendar.event.borderLeft,
        ...(trespassingStart && {
          borderTop: `${trespassPx} solid ${TRESPASS_BORDER_COLOR}`,
        }),
        ...(trespassingEnd && {
          borderBottom: `${trespassPx} solid ${TRESPASS_BORDER_COLOR}`,
        }),
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
