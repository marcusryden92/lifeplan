import React, { ReactNode, useLayoutEffect } from "react";
import { EventImpl } from "@fullcalendar/core/internal";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { formatTime } from "@/utils/calendarUtils";
import { handleDoubleClick } from "@/utils/calendarEventHandlers";
import { vars } from "@/lib/theme";
import {
  TRESPASS_BORDER_COLOR,
  TRESPASS_BORDER_WIDTH,
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
      element.style.zIndex = showPopover ? "30" : "";
    }
  }, [elementHeight, showPopover]);

  if (!event.start || !event.end) return null;

  const startTime = new Date(event.start);
  const endTime = new Date(event.end);

  const extendedProps =
    event.extendedProps as EventExtendedPropsWithTrespassing;
  const trespassingStart = extendedProps?.trespassingStart ?? false;
  const trespassingEnd = extendedProps?.trespassingEnd ?? false;
  const tint = isCompleted
    ? userSettings.styles.events.completedColor
    : event.backgroundColor;
  const trespassPx = `${TRESPASS_BORDER_WIDTH}px`;

  const compact = elementHeight < 28;
  const glassFill = `color-mix(in srgb, ${tint} 80%, transparent)`;
  const glassStroke = `color-mix(in srgb, ${tint} 55%, transparent)`;

  return (
    <div
      ref={elementRef}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        padding: compact ? "2px 8px" : "6px 10px",
        borderRadius: 8,
        background: glassFill,
        backdropFilter: "blur(12px) saturate(160%)",
        WebkitBackdropFilter: "blur(12px) saturate(160%)",
        border: `1px solid ${glassStroke}`,
        boxShadow: showPopover
          ? `0 8px 20px color-mix(in srgb, ${vars.ink} 24%, transparent), inset 0 1px 0 rgba(255,255,255,0.32)`
          : `inset 0 1px 0 rgba(255,255,255,0.28)`,
        color: vars.ink,
        fontFamily: vars.font.ui,
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
            fontWeight: 600,
            letterSpacing: "-0.005em",
            lineHeight: 1.25,
            color: vars.ink,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: compact ? "nowrap" : "normal",
          }}
        >
          {event.title}
        </span>
        {!compact && (
          <span
            style={{
              display: "flex",
              gap: 4,
              fontSize: 10,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              color: vars.inkSoft,
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

      {children}
    </div>
  );
};

export default EventWrapper;
