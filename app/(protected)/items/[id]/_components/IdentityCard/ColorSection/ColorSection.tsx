"use client";

import { PopoverColorPicker } from "@/components/events/PopoverColorPicker";
import { calendarColors } from "@/data/calendarColors";
import { useItem } from "../../ItemContext";
import { fieldStack, fieldLabel } from "./ColorSection.css";

export function ColorSection() {
  const { item, changeColor } = useItem();

  return (
    <div className={fieldStack}>
      <span className={fieldLabel}>Color</span>
      <PopoverColorPicker
        currentColor={item.color || calendarColors[0]}
        onChange={changeColor}
      />
    </div>
  );
}
