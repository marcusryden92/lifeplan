"use client";

import React from "react";
import { action, iconSlot } from "./PopoverAction.css";

export type PopoverActionVariant =
  | "row"
  | "danger"
  | "primary"
  | "primaryFilled";

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
      className={action[variant]}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={iconSlot[variant]}>{icon}</span>
      {label}
    </button>
  );
}
