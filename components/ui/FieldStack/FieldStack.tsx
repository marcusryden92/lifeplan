import { type ReactNode } from "react";
import {
  fieldStack,
  fieldStackFull,
  fieldLabel,
  fieldValue,
} from "./FieldStack.css";

interface FieldStackProps {
  label: ReactNode;
  // Spans the full width of a multi-column field grid.
  full?: boolean;
  className?: string;
  children: ReactNode;
}

// Label stacked above an arbitrary control. Deliberately a <div>, not the
// <label> of the Input primitive's Field: these wrap button-based controls
// (Combobox, SegmentedControl, color/type pickers) that a <label> would hijack.
export function FieldStack({ label, full, className, children }: FieldStackProps) {
  const classes = [fieldStack, full && fieldStackFull, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <span className={fieldLabel}>{label}</span>
      {children}
    </div>
  );
}

// The bold tabular read-only counterpart to a control, for fields that only
// display a value (e.g. a goal's rolled-up total duration).
export function FieldValue({ children }: { children: ReactNode }) {
  return <span className={fieldValue}>{children}</span>;
}
