"use client";

import React from "react";
import { pillBtn } from "@/lib/theme";
import {
  rowLayout,
  pillLayout,
  dangerText,
  iconSlot,
} from "./PopoverAction.css";

export type PopoverActionVariant =
  | "row"
  | "danger"
  | "primary"
  | "primaryFilled";

const variantClass: Record<PopoverActionVariant, string> = {
  row: `${pillBtn({ variant: "ghost", size: "sm" })} ${rowLayout}`,
  danger: `${pillBtn({ variant: "ghost", size: "sm" })} ${rowLayout} ${dangerText}`,
  primary: `${pillBtn({ variant: "glass", size: "sm" })} ${pillLayout}`,
  primaryFilled: `${pillBtn({ variant: "solid", size: "sm" })} ${pillLayout}`,
};

interface PopoverActionProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: PopoverActionVariant;
  disabled?: boolean;
}

export function PopoverAction({
  onClick,
  icon,
  label,
  variant = "row",
  disabled,
}: PopoverActionProps) {
  return (
    <button
      type="button"
      className={variantClass[variant]}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={iconSlot[variant]}>{icon}</span>
      {label}
    </button>
  );
}
