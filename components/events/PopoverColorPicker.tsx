"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { calendarColors } from "@/data/calendarColors";
import {
  vars,
  popover as popoverRecipe,
  interactiveTransition,
} from "@/lib/theme";

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

const SWATCH_SIZE = 16;
const GRID_COLS = 8;
const GRID_GAP = 4;
const POPUP_PAD = 10;
// Visible-row cap before the grid scrolls (keeps the popup compact even if a
// user grows the palette to 36+ swatches).
const VISIBLE_ROWS = 4;
const POPUP_MAX_HEIGHT =
  VISIBLE_ROWS * (SWATCH_SIZE + GRID_GAP) - GRID_GAP + POPUP_PAD * 2;
const POPUP_WIDTH =
  GRID_COLS * SWATCH_SIZE + (GRID_COLS - 1) * GRID_GAP + POPUP_PAD * 2;

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
        <button
          type="button"
          aria-label="Pick color"
          // alignSelf prevents the popover's flex-column body from stretching
          // this control across the full width — it sizes to its content.
          style={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 12px 4px 4px",
            borderRadius: 999,
            background: vars.glass.bgSoft,
            border: `1px solid ${vars.glass.stroke}`,
            color: vars.ink,
            cursor: "pointer",
            fontFamily: vars.font.ui,
            fontSize: 11.5,
            fontWeight: 600,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: currentColor,
              border: `1px solid ${vars.glass.stroke}`,
              boxShadow: `inset 0 1px 0 ${vars.glass.hi}`,
            }}
          />
          <span style={{ color: vars.inkSoft }}>Color</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={popoverRecipe({ size: "sm" })}
          aria-label="Color swatches"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          style={{
            width: POPUP_WIDTH,
            maxHeight: POPUP_MAX_HEIGHT,
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarGutter: "stable",
            padding: POPUP_PAD,
            zIndex: 60,
            display: "grid",
            gridTemplateColumns: `repeat(${GRID_COLS}, ${SWATCH_SIZE}px)`,
            gap: GRID_GAP,
            justifyContent: "center",
          }}
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
                style={{
                  width: SWATCH_SIZE,
                  height: SWATCH_SIZE,
                  borderRadius: 999,
                  border: `1px solid ${
                    active ? vars.ink : vars.glass.stroke
                  }`,
                  background: color,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  boxShadow: active
                    ? `0 0 0 1.5px ${vars.paper}, 0 0 0 2.5px ${vars.ink}`
                    : "none",
                  transition: interactiveTransition("transform", "box-shadow"),
                }}
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
