"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useSelector } from "react-redux";
import {
  AlertTriangle,
  ArrowUpRight,
  Car,
  Clock,
  GripVertical,
  Settings,
  X,
} from "lucide-react";
import { EventImpl } from "@fullcalendar/core/internal";
import { formatTime } from "@/utils/calendarUtils";
import type { RootState } from "@/redux/store";
import { TypeBadge } from "@/components/ui";
import { CalendarPopover } from "../CalendarPopover";
import { PopoverAction } from "../PopoverAction";
import {
  header,
  dragHandle,
  headerBadges,
  closeBtn,
  titleRow,
  titleStatic,
  body,
  metaRow,
} from "../CalendarPopover/CalendarPopover.css";
import {
  headerCursor,
  tone,
  statusNote,
  travelTitle,
  titleIcon,
  mutedText,
  estimateRow,
  estimateValue,
  alertBox,
  alertIcon,
  alertText,
  footerActions,
} from "./TravelEventPopover.css";

interface TravelExtendedProps {
  travelMinutes?: number;
  requiredTravelMinutes?: number | null;
  insufficientTravel?: boolean;
  overconstrained?: boolean;
  fromLocationId?: string | null;
  toLocationId?: string | null;
}

interface TravelEventPopoverProps {
  event: EventImpl;
  eventRect: DOMRect;
  startTime: Date;
  endTime: Date;
  onClose: () => void;
}

const POPOVER_WIDTH = 340;
const POPOVER_HEIGHT = 320;

const TravelEventPopover: React.FC<TravelEventPopoverProps> = ({
  event,
  eventRect,
  startTime,
  endTime,
  onClose,
}) => {
  const router = useRouter();
  const locations = useSelector(
    (state: RootState) => state.schedulingSettings.locations,
  );

  const locationNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const loc of locations) m.set(loc.id, loc.name);
    return m;
  }, [locations]);

  const ext = event.extendedProps as TravelExtendedProps;
  const travelMinutes = ext.travelMinutes;
  const requiredMinutes = ext.requiredTravelMinutes ?? null;
  const insufficient = !!ext.insufficientTravel;
  const overconstrained = !!ext.overconstrained && !insufficient;

  const fromName = ext.fromLocationId
    ? (locationNameMap.get(ext.fromLocationId) ?? "Unknown")
    : "Start";
  const toName = ext.toLocationId
    ? (locationNameMap.get(ext.toLocationId) ?? "Unknown")
    : "End";

  const allottedLabel = travelMinutes != null ? `${travelMinutes}m` : null;
  const requiredLabel = requiredMinutes != null ? `${requiredMinutes}m` : null;

  const openLocationsRoute = () => {
    onClose();
    router.push("/locations");
  };

  const variant: "ok" | "warning" | "error" = insufficient
    ? "error"
    : overconstrained
      ? "warning"
      : "ok";

  return (
    <CalendarPopover
      anchorRect={eventRect}
      width={POPOVER_WIDTH}
      height={POPOVER_HEIGHT}
      title={event.title || "Travel details"}
      onClose={onClose}
    >
      {({ startDrag, isDragging }) => (
        <>
          <div
            className={`${header} ${headerCursor[isDragging ? "dragging" : "idle"]}`}
          >
            <button
              type="button"
              className={dragHandle}
              onMouseDown={startDrag}
              aria-label="Drag to move"
              title="Drag to move"
            >
              <GripVertical size={16} strokeWidth={2} />
            </button>
            <div className={headerBadges}>
              <TypeBadge
                size="sm"
                tone={
                  variant === "error"
                    ? "error"
                    : variant === "warning"
                      ? "warning"
                      : "type"
                }
              >
                {variant === "error"
                  ? "warning"
                  : variant === "warning"
                    ? "overconstrained"
                    : "travel"}
              </TypeBadge>
              {variant !== "ok" && (
                <span className={`${statusNote} ${tone[variant]}`}>
                  {variant === "error"
                    ? "insufficient travel time"
                    : "travel window exceeded"}
                </span>
              )}
            </div>
            <button
              type="button"
              className={closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          <div className={titleRow}>
            <h3
              className={`${titleStatic} ${travelTitle}`}
              title={`${fromName} → ${toName}`}
            >
              <Car size={18} strokeWidth={2} aria-hidden className={titleIcon} />
              {fromName} <span className={mutedText}>→</span> {toName}
            </h3>
          </div>

          <div className={body}>
            <div className={metaRow}>
              <Clock size={13} strokeWidth={2} aria-hidden className={mutedText} />
              <span>
                {format(startTime, "EEE MMM d")} · {formatTime(startTime)} –{" "}
                {formatTime(endTime)}
                {allottedLabel ? ` · ${allottedLabel} allotted` : ""}
              </span>
            </div>

            {requiredLabel && (
              <div className={estimateRow}>
                <span className={mutedText}>Engine estimate</span>
                <span className={estimateValue}>{requiredLabel}</span>
                {allottedLabel && requiredMinutes != null && travelMinutes != null && (
                  <span className={`${estimateValue} ${tone[variant]}`}>
                    ·{" "}
                    {requiredMinutes - travelMinutes > 0
                      ? `${requiredMinutes - travelMinutes}m short`
                      : `${travelMinutes - requiredMinutes}m extra`}
                  </span>
                )}
              </div>
            )}

            {variant !== "ok" && (
              <div className={alertBox[variant]}>
                <AlertTriangle
                  size={14}
                  strokeWidth={2.2}
                  className={`${alertIcon} ${tone[variant]}`}
                  aria-hidden
                />
                <span className={alertText}>
                  {variant === "error"
                    ? "The engine couldn't fit the full travel time between these events. The route will run short — consider freeing up time on either side, or switch to a faster transport mode in Locations."
                    : "This travel slot is longer than the route's expected duration. The engine reserved the window to keep surrounding events from drifting."}
                </span>
              </div>
            )}

            <div className={footerActions}>
              <PopoverAction
                onClick={openLocationsRoute}
                icon={<Settings size={13} strokeWidth={2} />}
                label="Adjust travel times in Locations"
              />
              <PopoverAction
                onClick={openLocationsRoute}
                icon={<ArrowUpRight size={13} strokeWidth={2} />}
                label="Open full travel matrix"
              />
            </div>
          </div>
        </>
      )}
    </CalendarPopover>
  );
};
export default TravelEventPopover;
