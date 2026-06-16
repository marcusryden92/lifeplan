import React, { useRef, useState, useLayoutEffect, useMemo } from "react";
import { EventImpl } from "@fullcalendar/core/internal";
import { useSelector } from "react-redux";
import { AlertTriangle, Car } from "lucide-react";
// TODO: replace `Car` with a per-event mode icon (Car/Bike/Bus/Walk) once
// TravelTime's transportMode is plumbed through to the calendar event's
// extendedProps. The TravelTime record carries DRIVING/TRANSIT/BICYCLING/
// WALKING but the engine only emits a duration today.
import { RootState } from "@/redux/store";
import { useTheme } from "@/components/ui";
import { formatTime } from "@/utils/calendarUtils";
import { handleDoubleClick } from "@/utils/calendarEventHandlers";
import { vars } from "@/lib/theme";
import { useSetCalendarHoverLabel } from "./CalendarHoverLabelContext";
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
  const { dark } = useTheme();
  const setHoverLabel = useSetCalendarHoverLabel();
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

  // Same three-tier system as EventWrapper. Travel events are usually small
  // (5-15 min), so tiny/compact are the common cases.
  const tier: "tiny" | "compact" | "regular" =
    elementHeight < 13 ? "tiny" : elementHeight < 24 ? "compact" : "regular";
  const showLabel = tier !== "tiny";
  // Time renders below the label, not next to it. Needs a second-line worth
  // of vertical room PLUS bottom padding so it doesn't kiss the tile edge.
  // ~48 covers: 6px top + ~16 title + 2 gap + ~14 time + 6 bottom + ~4 breath.
  const showTime = tier === "regular" && elementHeight >= 48 && elementWidth >= 70;
  const showMinutes = tier === "regular" && elementWidth >= 110;
  const titleFont = tier === "compact" ? 10 : 11.5;
  const padding =
    tier === "tiny"
      ? "0 4px"
      : tier === "compact"
        ? "1px 8px"
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
      onMouseEnter={() => setHoverLabel?.({ name: travelLabel, color: null })}
      onMouseLeave={() => setHoverLabel?.(null)}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        padding,
        borderRadius: 8,
        background: alertColor
          ? `color-mix(in srgb, ${alertColor} 78%, transparent)`
          : dark
            ? "rgba(230, 232, 236, 0.65)"
            : "#f2efea",
        border: `1px solid ${alertColor ?? "#16142a"}`,
        fontFamily: vars.font.ui,
        color: alertColor ? "#fff" : "#16142a",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {showLabel && (
        <span
          style={{
            fontSize: titleFont,
            fontWeight: 500,
            fontStyle: alertColor ? "normal" : "italic",
            display: "flex",
            alignItems: "center",
            gap: 6,
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
            <Car
              size={12}
              strokeWidth={2}
              style={{ flexShrink: 0, opacity: 0.78 }}
              aria-hidden
            />
          )}
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {travelLabel}
          </span>
          {travelMinutes !== undefined && showMinutes && (
            <span
              style={{
                flexShrink: 0,
                fontWeight: 500,
                opacity: 0.7,
                fontVariantNumeric: "tabular-nums",
                paddingRight: 4,
              }}
            >
              {travelMinutes}m
              {showAlert &&
                requiredTravelMinutes !== null &&
                requiredTravelMinutes !== undefined && (
                  <> /{requiredTravelMinutes}</>
                )}
              {showOverconstrained &&
                requiredTravelMinutes !== null &&
                requiredTravelMinutes !== undefined && (
                  <> /{requiredTravelMinutes}</>
                )}
            </span>
          )}
        </span>
        )}
        {showTime && (
          <span
            style={{
              display: "flex",
              gap: 4,
              fontSize: 10,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              opacity: 0.7,
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
