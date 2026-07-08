"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import {
  comboboxWrap,
  comboboxTrigger,
  comboboxTriggerDisabled,
  comboboxMenu,
  comboboxOption,
  comboboxOptionActive,
  comboboxChevron,
} from "./Combobox.css";

export interface ComboboxOption<V extends string | null> {
  value: V;
  label: ReactNode;
  searchLabel?: string;
}

interface ComboboxProps<V extends string | null> {
  value: V;
  options: ComboboxOption<V>[];
  onChange: (value: V) => void;
  renderValue?: (option: ComboboxOption<V> | undefined) => ReactNode;
  placeholder?: ReactNode;
  ariaLabel?: string;
  width?: number | string;
  disabled?: boolean;
}

export function Combobox<V extends string | null>({
  value,
  options,
  onChange,
  renderValue,
  placeholder = "Select…",
  ariaLabel,
  width,
  disabled = false,
}: ComboboxProps<V>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
      }}
    >
      <div
        className={comboboxWrap}
        style={width != null ? { width, display: "block" } : undefined}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            className={`${comboboxTrigger} ${disabled ? comboboxTriggerDisabled : ""}`}
            aria-haspopup="listbox"
            aria-label={ariaLabel}
            aria-disabled={disabled}
            disabled={disabled}
            style={width != null ? { width: "100%" } : undefined}
          >
            <span
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: "left",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {renderValue ? renderValue(current) : current?.label ?? placeholder}
            </span>
            <ChevronDown
              size={12}
              strokeWidth={2.2}
              className={comboboxChevron}
              aria-hidden
            />
          </button>
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Content
          className={comboboxMenu}
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
                className={`${comboboxOption} ${
                  active ? comboboxOptionActive : ""
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
