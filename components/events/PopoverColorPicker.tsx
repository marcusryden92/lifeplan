"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { calendarColors } from "@/data/calendarColors";
import { useModalStack } from "@/hooks/useModalStack";
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
}

type MenuPos = { left: number; top: number };

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
}: Props) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { isTop } = useModalStack(open);

  const updatePos = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    let left = rect.left;
    let top = rect.bottom + 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left + POPUP_WIDTH > vw - 8) left = vw - POPUP_WIDTH - 8;
    if (left < 8) left = 8;
    if (top + POPUP_MAX_HEIGHT > vh - 8) {
      // Flip above when there isn't room below.
      top = rect.top - POPUP_MAX_HEIGHT - 6;
    }
    setMenuPos({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (open) updatePos();
    else setMenuPos(null);
  }, [open, updatePos]);

  useEffect(() => {
    if (!open || !isTop) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t))
        return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, isTop]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePos();
    const onResize = () => updatePos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePos]);

  const swatches = [...calendarColors, ...customColors];

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
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
      {open &&
        menuPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className={popoverRecipe({ size: "sm" })}
            role="dialog"
            aria-label="Color swatches"
            style={{
              position: "fixed",
              left: menuPos.left,
              top: menuPos.top,
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
              const active =
                currentColor.toLowerCase() === color.toLowerCase();
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
          </div>,
          document.body,
        )}
    </>
  );
}
