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
import { vars, colorMixAlpha } from "@/lib/theme";
import { CalendarPopover } from "./CalendarPopover";
import {
  header,
  dragHandle,
  headerBadges,
  closeBtn,
  titleRow,
  titleStatic,
  body,
  metaRow,
} from "./CalendarPopover.css";

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

  const accent =
    variant === "error"
      ? vars.status.error
      : variant === "warning"
        ? vars.status.warning
        : vars.muted;

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
            className={header}
            style={{ cursor: isDragging ? "grabbing" : "default" }}
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
                <span
                  style={{
                    fontFamily: vars.font.ui,
                    fontSize: 11,
                    color: accent,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                  }}
                >
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
              className={titleStatic}
              style={{
                cursor: "default",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
              title={`${fromName} → ${toName}`}
            >
              <Car
                size={18}
                strokeWidth={2}
                aria-hidden
                style={{ color: vars.muted, flexShrink: 0 }}
              />
              {fromName} <span style={{ color: vars.muted }}>→</span> {toName}
            </h3>
          </div>

          <div className={body}>
            <div className={metaRow}>
              <Clock
                size={13}
                strokeWidth={2}
                aria-hidden
                style={{ color: vars.muted }}
              />
              <span>
                {format(startTime, "EEE MMM d")} · {formatTime(startTime)} –{" "}
                {formatTime(endTime)}
                {allottedLabel ? ` · ${allottedLabel} allotted` : ""}
              </span>
            </div>

            {requiredLabel && (
              <div
                style={{
                  fontSize: 12,
                  color: vars.inkSoft,
                  fontFamily: vars.font.ui,
                  fontVariantNumeric: "tabular-nums",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ color: vars.muted }}>Engine estimate</span>
                <span style={{ fontWeight: 600 }}>{requiredLabel}</span>
                {allottedLabel && requiredMinutes != null && travelMinutes != null && (
                  <span
                    style={{
                      color: accent,
                      fontWeight: 600,
                    }}
                  >
                    ·{" "}
                    {requiredMinutes - travelMinutes > 0
                      ? `${requiredMinutes - travelMinutes}m short`
                      : `${travelMinutes - requiredMinutes}m extra`}
                  </span>
                )}
              </div>
            )}

            {variant !== "ok" && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${accent}`,
                  background: `color-mix(in srgb, ${accent} ${colorMixAlpha.subtleFill}%, transparent)`,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <AlertTriangle
                  size={14}
                  strokeWidth={2.2}
                  style={{ color: accent, marginTop: 1, flexShrink: 0 }}
                  aria-hidden
                />
                <span
                  style={{
                    fontSize: 11.5,
                    color: vars.ink,
                    lineHeight: 1.45,
                    fontFamily: vars.font.ui,
                  }}
                >
                  {variant === "error"
                    ? "The engine couldn't fit the full travel time between these events. The route will run short — consider freeing up time on either side, or switch to a faster transport mode in Locations."
                    : "This travel slot is longer than the route's expected duration. The engine reserved the window to keep surrounding events from drifting."}
                </span>
              </div>
            )}

            <div
              style={{
                paddingTop: 8,
                borderTop: `1px solid ${vars.rule}`,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <PopAction
                onClick={openLocationsRoute}
                icon={<Settings size={13} strokeWidth={2} />}
                label="Adjust travel times in Locations"
              />
              <PopAction
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


function PopAction({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 8px",
        borderRadius: 8,
        border: "none",
        background: "transparent",
        color: vars.ink,
        fontFamily: vars.font.ui,
        fontSize: 12.5,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span style={{ display: "inline-flex", color: vars.muted }}>{icon}</span>
      {label}
    </button>
  );
}

export default TravelEventPopover;
