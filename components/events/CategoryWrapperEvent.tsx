"use client";

import React from "react";
import { vars } from "@/lib/theme";
import {
  TRESPASS_BORDER_COLOR,
  TRESPASS_BORDER_WIDTH,
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

  const accent = categoryColor || vars.accent.primary;
  const stripeColor = `color-mix(in srgb, ${accent} 28%, transparent)`;
  const borderColor = `color-mix(in srgb, ${accent} 45%, transparent)`;
  const trespassPx = `${TRESPASS_BORDER_WIDTH}px`;

  return (
    <div
      className="relative w-full h-full"
      style={{
        background: `repeating-linear-gradient(45deg, transparent 0 4px, ${stripeColor} 4px 5px)`,
        border: `1px ${isStrict ? "solid" : "dashed"} ${borderColor}`,
        borderRadius: 6,
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
