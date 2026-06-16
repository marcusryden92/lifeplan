import type { ReactNode } from "react";
import {
  segmentedControl,
  segmentedThumb,
  segmentedButton,
} from "./SegmentedControl.css";

export type SegmentedOption<T extends string> = {
  key: T;
  label: ReactNode;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (next: T) => void;
}) {
  const n = options.length;
  const activeIdx = Math.max(
    0,
    options.findIndex((o) => o.key === value),
  );
  return (
    <div
      className={segmentedControl}
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
    >
      <span
        className={segmentedThumb}
        aria-hidden
        style={{
          width: `calc(${100 / n}% - ${6 / n}px)`,
          transform: `translateX(${activeIdx * 100}%)`,
        }}
      />
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={segmentedButton}
          data-active={o.key === value}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
