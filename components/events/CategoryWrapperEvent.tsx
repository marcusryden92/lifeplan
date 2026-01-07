"use client";

import React, { useState } from "react";
import { useCalendarProvider } from "@/context/CalendarProvider";
import EventContent from "./EventContent";

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
  const [isHovered, setIsHovered] = useState(false);
  const { calendar } = useCalendarProvider();

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHover?.(categoryId, categoryName);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover?.(null, null);
  };

  const backgroundColor = categoryColor
    ? `${categoryColor}10`
    : "rgba(59, 130, 246, 0.08)";

  // Find events that belong to this wrapper
  const wrappedEvents =
    calendar?.filter((event) => {
      return event.extendedProps?.categoryWrapperId === wrapperId;
    }) || [];

  return (
    <div
      className="relative w-full h-full p-1"
      style={{
        backgroundColor,
        border: `2px ${isStrict ? "solid" : "dashed"} ${categoryColor || "#3b82f6"}`,
        borderRadius: "4px",
        opacity: isHovered ? 1 : 0.7,
        transition: "opacity 0.2s",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Render contained events */}
      <div className="space-y-0.5">
        {wrappedEvents.map((event) => (
          <div
            key={event.id}
            className="text-xs"
            style={{
              fontSize: "11px",
              lineHeight: "1.2",
            }}
          >
            <EventContent eventInfo={{ event } as any} />
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
