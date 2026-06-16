"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
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
  /** Optional fixed width applied to the wrap and the trigger so the
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
  const current = options.find((o) => o.value === value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div
        className={dropdownWrap}
        style={width != null ? { width, display: "block" } : undefined}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            className={dropdownTrigger}
            aria-haspopup="listbox"
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
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Content
          className={dropdownMenu}
          role="listbox"
          align="start"
          sideOffset={6}
          style={{ minWidth: "var(--radix-popover-trigger-width)" }}
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
