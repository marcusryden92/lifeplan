"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { calendarColors } from "@/data/calendarColors";
import { vars, popover as popoverRecipe } from "@/lib/theme";
import {
  trigger,
  triggerDot,
  triggerLabel,
  popup,
  swatch,
} from "./PopoverColorPicker.css";

interface Props {
  /** The currently applied color (used to highlight the active swatch). */
  currentColor: string;
  /** Called with a new color when the user picks a swatch. */
  onChange: (color: string) => void;
  /** Optional extra swatches appended after the default palette. Wired up so
   *  user-saved custom colors will slot in later without touching this API. */
  customColors?: string[];
  /** Replace the base palette (defaults to `calendarColors`). */
  palette?: string[];
}

export function PopoverColorPicker({
  currentColor,
  onChange,
  customColors = [],
  palette,
}: Props) {
  const [open, setOpen] = useState(false);
  const swatches = [...(palette ?? calendarColors), ...customColors];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" aria-label="Pick color" className={trigger}>
          <span
            aria-hidden
            className={triggerDot}
            style={{ background: currentColor }}
          />
          <span className={triggerLabel}>Color</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={`${popoverRecipe({ size: "sm" })} ${popup}`}
          aria-label="Color swatches"
          align="start"
          sideOffset={6}
          collisionPadding={8}
        >
          {swatches.map((color) => {
            const active = currentColor.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
                aria-label={`Set color to ${color}`}
                aria-pressed={active}
                title={color}
                className={swatch[active ? "active" : "inactive"]}
                style={{ background: color }}
              >
                {active && (
                  <Check
                    size={9}
                    strokeWidth={3}
                    color={vars.textOnAccent}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
