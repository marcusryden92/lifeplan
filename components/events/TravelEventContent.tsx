import React, { useRef, useState, useLayoutEffect } from "react";
import { EventImpl } from "@fullcalendar/core/internal";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { formatTime } from "@/utils/calendarUtils";

interface TravelExtendedProps {
  travelMinutes?: number;
  requiredTravelMinutes?: number | null;
  insufficientTravel?: boolean;
}

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
  const extendedProps = event.extendedProps as TravelExtendedProps;
  const travelMinutes = extendedProps?.travelMinutes;
  const requiredTravelMinutes = extendedProps?.requiredTravelMinutes;
  const insufficientTravel = extendedProps?.insufficientTravel ?? false;

  // Warning icon for insufficient travel
  const WarningIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="#DC2626"
      style={{ width: "14px", height: "14px", flexShrink: 0 }}
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );

  // Travel arrow icon
  const TravelArrowIcon = () => (
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
  );

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
        opacity: insufficientTravel ? 0.95 : 0.85,
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
          {insufficientTravel ? <WarningIcon /> : <TravelArrowIcon />}
          {event.title}
          {travelMinutes !== undefined && elementHeight > 30 && (
            <span style={{ fontWeight: "normal", opacity: 0.8 }}>
              ({travelMinutes} min
              {insufficientTravel && requiredTravelMinutes && (
                <span style={{ color: "#DC2626" }}>
                  /{requiredTravelMinutes} needed
                </span>
              )}
              )
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
