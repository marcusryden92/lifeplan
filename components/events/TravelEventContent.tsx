import React, { useRef, useState, useLayoutEffect, useMemo } from "react";
import { EventImpl } from "@fullcalendar/core/internal";
import { useSelector } from "react-redux";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { RootState } from "@/redux/store";
import { formatTime } from "@/utils/calendarUtils";
import { handleDoubleClick } from "@/utils/calendarEventHandlers";
import { vars } from "@/lib/theme";
import TravelEventPopover from "./TravelEventPopover";

interface TravelExtendedProps {
  travelMinutes?: number;
  requiredTravelMinutes?: number | null;
  insufficientTravel?: boolean;
  overconstrained?: boolean;
  fromLocationId?: string | null;
  toLocationId?: string | null;
}

interface TravelEventContentProps {
  event: EventImpl;
}

const TravelEventContent: React.FC<TravelEventContentProps> = ({ event }) => {
  const locations = useSelector(
    (state: RootState) => state.schedulingSettings.locations,
  );
  const elementRef = useRef<HTMLDivElement>(null);
  const [elementHeight, setElementHeight] = useState<number>(0);
  const [elementWidth, setElementWidth] = useState<number>(0);
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [eventRect, setEventRect] = useState<DOMRect | null>(null);

  const locationNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of locations) {
      map.set(loc.id, loc.name);
    }
    return map;
  }, [locations]);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (element) {
      setElementHeight(element.offsetHeight);
      setElementWidth(element.offsetWidth);
    }
  }, []);

  if (!event.start || !event.end) return null;

  const startTime = new Date(event.start);
  const endTime = new Date(event.end);
  const extendedProps = event.extendedProps as TravelExtendedProps;
  const travelMinutes = extendedProps?.travelMinutes;
  const requiredTravelMinutes = extendedProps?.requiredTravelMinutes;
  const insufficientTravel = extendedProps?.insufficientTravel ?? false;
  const overconstrained = extendedProps?.overconstrained ?? false;
  const showAlert = insufficientTravel;
  const showOverconstrained = overconstrained && !insufficientTravel;
  const fromName = extendedProps?.fromLocationId
    ? (locationNameMap.get(extendedProps.fromLocationId) ??
      extendedProps.fromLocationId)
    : null;
  const toName = extendedProps?.toLocationId
    ? (locationNameMap.get(extendedProps.toLocationId) ??
      extendedProps.toLocationId)
    : null;
  const travelLabel = fromName && toName ? `${fromName} → ${toName}` : "Travel";

  // Same three-tier system as EventWrapper, plus a width gate for the time
  // pill so narrow travel slots don't crowd the from→to label out.
  const tier: "tiny" | "compact" | "regular" =
    elementHeight < 18 ? "tiny" : elementHeight < 32 ? "compact" : "regular";
  const showTime = tier === "regular" && elementWidth >= 110;
  const showMinutes = tier !== "tiny" && elementHeight > 36;
  const titleFont = tier === "tiny" ? 9 : tier === "compact" ? 10 : 11.5;
  const padding =
    tier === "tiny"
      ? "0 6px"
      : tier === "compact"
        ? "2px 8px"
        : "6px 10px";
  const alertColor = showAlert
    ? vars.status.error
    : showOverconstrained
      ? vars.status.warning
      : null;

  return (
    <div
      ref={elementRef}
      onDoubleClick={(e) =>
        handleDoubleClick(e, elementRef, setEventRect, setShowPopover)
      }
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        padding,
        borderRadius: 8,
        background: alertColor
          ? `color-mix(in srgb, ${alertColor} 78%, transparent)`
          : "rgba(26, 29, 42, 0.92)",
        border: `1px solid ${alertColor ?? "#1a1d2a"}`,
        fontFamily: vars.font.ui,
        color: "#fff",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: titleFont,
            fontWeight: 500,
            fontStyle: alertColor ? "normal" : "italic",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {alertColor ? (
            <AlertTriangle
              size={12}
              strokeWidth={2.2}
              style={{ flexShrink: 0 }}
              aria-hidden
            />
          ) : (
            <ChevronRight
              size={12}
              strokeWidth={2}
              style={{ flexShrink: 0, opacity: 0.6 }}
              aria-hidden
            />
          )}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {travelLabel}
            {travelMinutes !== undefined && showMinutes && (
              <span
                style={{
                  fontWeight: 500,
                  opacity: 0.78,
                  marginLeft: 6,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ({travelMinutes}m
                {showAlert &&
                  requiredTravelMinutes !== null &&
                  requiredTravelMinutes !== undefined && (
                    <span>
                      {" "}
                      /{requiredTravelMinutes} needed
                    </span>
                  )}
                {showOverconstrained &&
                  requiredTravelMinutes !== null &&
                  requiredTravelMinutes !== undefined && (
                    <span>
                      {" "}
                      /{requiredTravelMinutes} actual
                    </span>
                  )}
                )
              </span>
            )}
          </span>
        </span>
        {showTime && (
          <span
            style={{
              display: "flex",
              gap: 4,
              fontSize: 10,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              opacity: 0.7,
              flexShrink: 0,
            }}
          >
            <span>{formatTime(startTime)}</span>
            <span aria-hidden style={{ opacity: 0.6 }}>
              –
            </span>
            <span>{formatTime(endTime)}</span>
          </span>
        )}
      </div>

      {showPopover && eventRect && (
        <TravelEventPopover
          event={event}
          eventRect={eventRect}
          startTime={startTime}
          endTime={endTime}
          onClose={() => setShowPopover(false)}
        />
      )}
    </div>
  );
};

export default TravelEventContent;
