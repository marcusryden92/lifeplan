"use client";

import React from "react";

interface CategoryWrapperEventProps {
  categoryId: string;
  categoryName: string;
  categoryColor?: string | null;
  isStrict: boolean;
  start: Date;
  end: Date;
  wrapperId: string;
  onHover?: (categoryName: string | null, categoryColor: string | null) => void;
}

/**
 * Background event component for category time slots.
 * Items within the category are rendered as separate foreground events by FullCalendar.
 */
export function CategoryWrapperEvent({
  categoryId: _categoryId,
  categoryName,
  categoryColor,
  isStrict,
  start: _start,
  end: _end,
  wrapperId: _wrapperId,
  onHover,
}: CategoryWrapperEventProps) {
  const handleMouseEnter = () => {
    onHover?.(categoryName, categoryColor || null);
  };

  const handleMouseLeave = () => {
    onHover?.(null, null);
  };

  const backgroundColor = categoryColor
    ? `${categoryColor}20`
    : "rgba(59, 130, 246, 0.12)";

  return (
    <div
      className="relative w-full h-full"
      style={{
        backgroundColor,
        border: `1px ${isStrict ? "solid" : "solid"} ${categoryColor || "#3b82f6"}`,
        borderRadius: "4px",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
}
