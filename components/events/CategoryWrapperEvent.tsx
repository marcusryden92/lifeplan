"use client";

import React, { useState } from "react";

interface CategoryWrapperEventProps {
  categoryId: string;
  categoryName: string;
  categoryColor?: string | null;
  isStrict: boolean;
  start: Date;
  end: Date;
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
  start: _start,
  end: _end,
  children,
  onHover,
}: CategoryWrapperEventProps) {
  const [isHovered, setIsHovered] = useState(false);

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

  return (
    <div
      className="relative w-full h-full"
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
      {children}
    </div>
  );
}
