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
  trespassingStart?: boolean;
  trespassingEnd?: boolean;
  onHover?: (categoryName: string | null, categoryColor: string | null) => void;
}

/**
 * Background event component for category time slots.
 * Items within the category are rendered as separate foreground events by FullCalendar.
 *
 * `trespassingStart` / `trespassingEnd` overlay a red border on the
 * corresponding side, indicating the travel pass found a too-tight transition
 * at that boundary (same visual language as overlap-trespass on regular events).
 */
export function CategoryWrapperEvent({
  categoryId: _categoryId,
  categoryName,
  categoryColor,
  isStrict,
  start: _start,
  end: _end,
  wrapperId: _wrapperId,
  trespassingStart = false,
  trespassingEnd = false,
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
        border: `1px ${isStrict ? "solid" : "dotted"} ${categoryColor || "#3b82f6"}`,
        borderRadius: "4px",
        ...(trespassingStart && { borderTop: "4px solid #DC2626" }),
        ...(trespassingEnd && { borderBottom: "4px solid #DC2626" }),
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
}
