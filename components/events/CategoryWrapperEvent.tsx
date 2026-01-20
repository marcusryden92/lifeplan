"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useCalendarProvider } from "@/context/CalendarProvider";
import EventContent from "./EventContent";
import { EventImpl } from "@fullcalendar/core/internal";
import { RuntimeEventExtendedProps } from "@/types/ui";
import type { SimpleEvent } from "@/types/prisma";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

interface CategoryWrapperEventProps {
  categoryId: string;
  categoryName: string;
  categoryColor?: string | null;
  isStrict: boolean;
  start: Date;
  end: Date;
  wrapperId: string; // The unique ID for this wrapper instance
  children?: React.ReactNode;
  onHover?: (categoryId: string | null, categoryName: string | null) => void;
}

/**
 * Wrapper component for category time slots that contains nested items
 */
export function CategoryWrapperEvent({
  categoryId,
  categoryName,
  categoryColor,
  isStrict,
  start,
  end,
  wrapperId,
  children,
  onHover,
}: CategoryWrapperEventProps) {
  const { calendar } = useCalendarProvider();
  const bufferTimeMinutes = useSelector(
    (state: RootState) => state.schedulingSettings.bufferTimeMinutes
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [wrapperHeight, setWrapperHeight] = useState<number>(0);

  // Observe wrapper size to keep pixel calculations accurate
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const updateSize = () => setWrapperHeight(el.clientHeight);
    updateSize();

    const ro = new ResizeObserver(() => updateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleMouseEnter = () => {
    onHover?.(categoryId, categoryName);
  };

  const handleMouseLeave = () => {
    onHover?.(null, null);
  };

  const backgroundColor = categoryColor
    ? `${categoryColor}10`
    : "rgba(59, 130, 246, 0.08)";

  // Precompute wrapped events only (no travel in wrapper sizing)
  const wrappedEvents = useMemo(() => {
    const events = calendar || [];
    return events.filter((event) => {
      const ext = event.extendedProps as RuntimeEventExtendedProps | undefined;
      return ext?.categoryWrapperId === wrapperId;
    });
  }, [calendar, wrapperId]);

  const wrapperStart = useMemo(() => new Date(start), [start]);
  const wrapperEnd = useMemo(() => new Date(end), [end]);
  const wrapperDurationMs = wrapperEnd.getTime() - wrapperStart.getTime();

  const positioned = useMemo(() => {
    const items = [] as Array<{
      event: SimpleEvent;
      topPercent: number;
      heightPercent: number;
      key: string;
    }>;

    if (wrapperDurationMs <= 0) return items;

    for (const event of wrappedEvents) {
      if (!event.start || !event.end) continue;
      const evStart = new Date(event.start);
      const evEnd = new Date(event.end);

      // Build envelope using ONLY the item's actual duration
      // Buffers should render as blank space between items, not inside them
      const envelopeStartMs = Math.max(
        wrapperStart.getTime(),
        evStart.getTime()
      );
      const envelopeEndMs = Math.min(wrapperEnd.getTime(), evEnd.getTime());

      if (envelopeEndMs <= envelopeStartMs) continue;

      const topPercent =
        ((envelopeStartMs - wrapperStart.getTime()) / wrapperDurationMs) * 100;
      const heightPercent =
        ((envelopeEndMs - envelopeStartMs) / wrapperDurationMs) * 100;

      items.push({
        event,
        topPercent,
        heightPercent,
        key: event.id,
      });
    }

    return items;
  }, [
    wrappedEvents,
    wrapperDurationMs,
    wrapperStart,
    wrapperEnd,
    bufferTimeMinutes,
  ]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-full"
      style={{
        backgroundColor,
        border: `2px ${isStrict ? "solid" : "dashed"} ${categoryColor || "#3b82f6"}`,
        borderRadius: "4px",
        // Remove container opacity to avoid tinting child items
        // You can adjust backgroundColor alpha if you want subtler tint
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Render contained events positioned by time inside wrapper */}
      <div className="absolute inset-0">
        {positioned.map(({ event, topPercent, heightPercent, key }) => {
          const topPx = (topPercent / 100) * wrapperHeight;
          const heightPx = (heightPercent / 100) * wrapperHeight;
          return (
            <div
              key={key}
              className="absolute left-0 right-0 pr-0.5"
              style={{ top: `${topPx}px`, height: `${heightPx}px` }}
            >
              <div
                className="h-full text-xs"
                style={{ fontSize: "11px", lineHeight: 1.2 }}
              >
                <EventContent event={event as unknown as EventImpl} />
              </div>
            </div>
          );
        })}
      </div>
      {children}
    </div>
  );
}
