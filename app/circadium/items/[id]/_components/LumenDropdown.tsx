"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import {
  dropdownWrap,
  dropdownTrigger,
  dropdownMenu,
  dropdownOption,
  dropdownOptionActive,
  dropdownChevron,
} from "./LumenDropdown.css";

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
}

export function LumenDropdown<V extends string | null>({
  value,
  options,
  onChange,
  renderValue,
  placeholder = "Select…",
  ariaLabel,
}: LumenDropdownProps<V>) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
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
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div className={dropdownWrap} ref={wrapRef}>
      <button
        type="button"
        className={dropdownTrigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
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
      {open && (
        <div className={dropdownMenu} role="listbox">
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
        </div>
      )}
    </div>
  );
}
