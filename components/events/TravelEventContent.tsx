import React, { useRef, useState, useLayoutEffect } from "react";
import { EventImpl } from "@fullcalendar/core/internal";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { formatTime } from "@/utils/calendarUtils";

interface TravelEventContentProps {
  event: EventImpl;
}

const TravelEventContent: React.FC<TravelEventContentProps> = ({ event }) => {
  const { userSettings } = useCalendarProvider();
  const elementRef = useRef<HTMLDivElement>(null);
  const [elementHeight, setElementHeight] = useState<number>(0);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (element) {
      setElementHeight(element.offsetHeight);
    }
  }, []);

  if (!event.start || !event.end) return null;

  const startTime = new Date(event.start);
  const endTime = new Date(event.end);
  const travelMinutes = (event.extendedProps as { travelMinutes?: number })
    ?.travelMinutes;

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
        backgroundColor: event.backgroundColor,
        borderLeft: userSettings.styles.travel.event.borderLeft,
        opacity: 0.85,
      }}
    >
      {/* Header row with title and time */}
      <span className="flex flex-col gap-2 justify-between">
        <span
          style={{
            marginBottom: "auto",
            fontSize: elementHeight > 20 ? "0.7rem" : "0.5rem",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            style={{ width: "12px", height: "12px" }}
          >
            <path
              fillRule="evenodd"
              d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
          {event.title}
          {travelMinutes && elementHeight > 30 && (
            <span style={{ fontWeight: "normal", opacity: 0.8 }}>
              ({travelMinutes} min)
            </span>
          )}
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
    </div>
  );
};

export default TravelEventContent;
