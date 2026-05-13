"use client";

import React from "react";
import {
  TRESPASS_BACKGROUND_COLOR,
  TRESPASS_BORDER_COLOR,
  TRESPASS_BORDER_WIDTH,
  getTrespassGradient,
} from "./trespassBorderStyles";

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
 * Trespass styling (location conflicts surfaced by the travel pass):
 *   - Red top/bottom border on whichever side trespasses.
 *   - Background uses a red→base→red gradient at low alpha so the wrapper
 *     interior signals the trespass without obscuring readability.
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

  const baseBackground = categoryColor
    ? `${categoryColor}20`
    : "rgba(59, 130, 246, 0.12)";
  const baseBorderColor = categoryColor || "#3b82f6";
  const trespassPx = `${TRESPASS_BORDER_WIDTH}px`;

  return (
    <div
      className="relative w-full h-full"
      style={{
        background: getTrespassGradient(
          trespassingStart,
          trespassingEnd,
          baseBackground,
          TRESPASS_BACKGROUND_COLOR,
        ),
        border: `1px ${isStrict ? "solid" : "dotted"} ${baseBorderColor}`,
        borderRadius: "4px",
        ...(trespassingStart && {
          borderTop: `${trespassPx} solid ${TRESPASS_BORDER_COLOR}`,
        }),
        ...(trespassingEnd && {
          borderBottom: `${trespassPx} solid ${TRESPASS_BORDER_COLOR}`,
        }),
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
}
