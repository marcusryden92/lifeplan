import React, { useRef, useState, useLayoutEffect, useMemo } from "react";
import { EventImpl } from "@fullcalendar/core/internal";
import { useSelector } from "react-redux";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { RootState } from "@/redux/store";
import { formatTime } from "@/utils/calendarUtils";
import { vars } from "@/lib/theme";

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

  const compact = elementHeight < 28;
  const alertColor = showAlert
    ? vars.status.error
    : showOverconstrained
      ? vars.status.warning
      : null;

  return (
    <div
      ref={elementRef}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        padding: compact ? "2px 8px" : "6px 10px",
        borderRadius: 8,
        background: alertColor
          ? `color-mix(in srgb, ${alertColor} 78%, transparent)`
          : `color-mix(in srgb, ${vars.ink} 92%, transparent)`,
        border: `1px solid ${alertColor ?? vars.ink}`,
        fontFamily: vars.font.ui,
        color: "#fff",
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
            fontSize: compact ? 10 : 11.5,
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
            {travelMinutes !== undefined && elementHeight > 36 && (
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
        {!compact && (
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
    </div>
  );
};

export default TravelEventContent;
