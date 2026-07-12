import React, { ReactNode, useLayoutEffect } from "react";
import { EventImpl } from "@fullcalendar/core/internal";
import { Pin } from "lucide-react";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import { formatTime } from "@/utils/calendarUtils";
import { handleDoubleClick } from "@/utils/calendarEventHandlers";
import { plannerIdFromEventId } from "@/utils/planRecurrence";
import { colorMixAlpha } from "@/lib/theme";
import { computeTemplateBorder } from "@/utils/colorUtils";
import { getEventTier } from "@/utils/eventTier";
import { useSetCalendarHoverLabel } from "../CalendarHoverLabelContext";
import {
  TRESPASS_BORDER_COLOR,
  TRESPASS_BORDER_WIDTH,
} from "../trespassBorderStyles";
import {
  tile,
  textBlock,
  titleRow,
  pin,
  title,
  timeRow,
  timeDash,
} from "./EventWrapper.css";

interface EventExtendedPropsWithTrespassing {
  trespassingStart?: boolean;
  trespassingEnd?: boolean;
  [key: string]: unknown;
}

interface EventWrapperProps {
  event: EventImpl;
  elementRef: React.RefObject<HTMLDivElement>;
  elementHeight: number;
  elementWidth: number;
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
  elementWidth,
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
  const { userSettings, planner, categories } = useCalendarProvider();
  const setHoverLabel = useSetCalendarHoverLabel();
  const isMobile = useIsMobile();

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
  const isPlan = extendedProps?.plannerType === "plan";
  const isTemplate = extendedProps?.eventType === "template";
  const tint = isCompleted
    ? userSettings.styles.events.completedColor
    : event.backgroundColor;
  const trespassPx = `${TRESPASS_BORDER_WIDTH}px`;

  const tier = getEventTier(elementHeight);
  const showTitle = tier !== "tiny";
  // Time renders on a row BELOW the title so it never crowds it horizontally.
  // Threshold reserves bottom padding so the time never kisses the tile edge —
  // if the tile is shorter than that, drop time entirely.
  const showTime =
    tier === "regular" && elementHeight >= 48 && elementWidth >= 70;
  const showPin = isPlan && tier !== "tiny";
  const glassFill = `color-mix(in srgb, ${tint} ${colorMixAlpha.denseFill}%, transparent)`;

  const border = isTemplate
    ? `2px dashed ${computeTemplateBorder(tint)}`
    : "none";

  return (
    <div
      ref={elementRef}
      className={tile[tier]}
      style={{
        background: glassFill,
        border,
        ...(trespassingStart && {
          borderTop: `${trespassPx} solid ${TRESPASS_BORDER_COLOR}`,
        }),
        ...(trespassingEnd && {
          borderBottom: `${trespassPx} solid ${TRESPASS_BORDER_COLOR}`,
        }),
      }}
      onMouseEnter={() => {
        setOnHover(true);
        if (!setHoverLabel) return;
        // Walk planner-parent chain to find effective categoryId (subtasks
        // inherit from their goal ancestor).
        let cursor = planner.find(
          (p) => p.id === plannerIdFromEventId(event.id),
        );
        let catId: string | null | undefined = cursor?.categoryId;
        const seen = new Set<string>();
        while (cursor && !catId && cursor.parentId && !seen.has(cursor.id)) {
          seen.add(cursor.id);
          cursor = planner.find((p) => p.id === cursor!.parentId);
          catId = cursor?.categoryId;
        }
        if (!catId) return;
        const cat = categories.find((c) => c.id === catId);
        if (cat) setHoverLabel({ name: cat.name, color: cat.color ?? null });
      }}
      onMouseLeave={() => {
        setOnHover(false);
        setHoverLabel?.(null);
      }}
      // No hover on touch — a single tap opens the popover (presented as a
      // bottom sheet on mobile). Desktop keeps double-click only. The popover
      // renders in this React tree but portals its DOM to body, so its clicks
      // bubble back here synthetically — the contains() check keeps a tap on
      // the sheet (dismiss, close button) from instantly reopening it.
      onClick={(e) => {
        if (!isMobile || disableInteraction) return;
        if (!elementRef.current?.contains(e.target as Node)) return;
        // A long-press just selected this tile for touch resize; iOS
        // synthesizes a click on release, which would open the bottom sheet
        // over the fresh resize handles. Tapping empty grid deselects, so a
        // normal tap on an unselected tile still opens the sheet.
        if (elementRef.current.closest(".fc-event-selected")) return;
        handleDoubleClick(e, elementRef, setEventRect, setShowPopover);
      }}
      onDoubleClick={(e) =>
        !disableInteraction &&
        handleDoubleClick(e, elementRef, setEventRect, setShowPopover)
      }
    >
      <div className={textBlock}>
        <div className={titleRow}>
          {showPin && (
            <Pin
              size={tier === "compact" ? 9 : 11}
              strokeWidth={2.2}
              aria-hidden
              className={pin}
            />
          )}
          {showTitle && (
            <span className={title[tier === "compact" ? "compact" : "regular"]}>
              {event.title}
            </span>
          )}
        </div>
        {showTime && (
          <span className={timeRow}>
            <span>{formatTime(startTime)}</span>
            <span aria-hidden className={timeDash}>
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
