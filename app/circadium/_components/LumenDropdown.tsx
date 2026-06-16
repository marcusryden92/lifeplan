"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { useModalStack } from "@/hooks/useModalStack";
import {
  dropdownWrap,
  dropdownTrigger,
  dropdownMenu,
  dropdownOption,
  dropdownOptionActive,
  dropdownChevron,
} from "./LumenDropdown.css";

type MenuPos = { left: number; top: number; minWidth: number };

export interface DropdownOption<V extends string | null> {
  value: V;
  label: ReactNode;
  // Used for keyboard search & a11y; defaults to stringified label.
  searchLabel?: string;
}

interface LumenDropdownProps<V extends string | null> {
  value: V;
  options: DropdownOption<V>[];
  onChange: (value: V) => void;
  renderValue?: (option: DropdownOption<V> | undefined) => ReactNode;
  placeholder?: ReactNode;
  ariaLabel?: string;
  /** Optional fixed width applied to both the wrap and the trigger so the
   *  control has a known footprint regardless of the selected option's text
   *  length. */
  width?: number | string;
}

export function LumenDropdown<V extends string | null>({
  value,
  options,
  onChange,
  renderValue,
  placeholder = "Select…",
  ariaLabel,
  width,
}: LumenDropdownProps<V>) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Register with the modal stack so an open dropdown owns outside-clicks and
  // Escape ahead of any popover/modal it sits inside.
  const { isTop } = useModalStack(open);

  const updatePos = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({
      left: rect.left,
      top: rect.bottom + 6,
      minWidth: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) updatePos();
    else setMenuPos(null);
  }, [open, updatePos]);

  // Outside-click / Escape only fire while this dropdown is the top of the
  // modal stack (so a color-picker popped on top can intercept them first).
  useEffect(() => {
    if (!open || !isTop) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
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

  // Scroll / resize repositioning stays attached for the whole lifetime of the
  // open dropdown — repositioning the menu doesn't depend on stack position.
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

  const current = options.find((o) => o.value === value);

  return (
    <div
      className={dropdownWrap}
      ref={wrapRef}
      style={width != null ? { width, display: "block" } : undefined}
    >
      <button
        ref={triggerRef}
        type="button"
        className={dropdownTrigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        style={width != null ? { width: "100%" } : undefined}
      >
        <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          {renderValue ? renderValue(current) : current?.label ?? placeholder}
        </span>
        <ChevronDown
          size={12}
          strokeWidth={2.2}
          className={dropdownChevron}
          aria-hidden
        />
      </button>
      {open &&
        menuPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className={dropdownMenu}
            role="listbox"
            style={{
              left: menuPos.left,
              top: menuPos.top,
              minWidth: menuPos.minWidth,
            }}
          >
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`${dropdownOption} ${
                    active ? dropdownOptionActive : ""
                  }`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
