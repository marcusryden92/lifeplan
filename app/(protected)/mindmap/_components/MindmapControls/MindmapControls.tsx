"use client";

import { useState } from "react";
import { SegmentedControl, type SegmentedOption } from "@/components/ui";
import type {
  MindmapLayoutKind,
  MindmapLayoutOptions,
} from "../../_lib/mindmapModel";
import {
  panel,
  header,
  title,
  collapse,
  body,
  field,
  fieldRow,
  label as labelClass,
  value as valueClass,
  slider,
} from "./MindmapControls.css";

const LAYOUT_OPTIONS: ReadonlyArray<SegmentedOption<MindmapLayoutKind>> = [
  { key: "radial", label: "Radial" },
  { key: "horizontal", label: "Horizontal" },
];

type SliderKey = Exclude<keyof MindmapLayoutOptions, "layout">;

type SliderDef = {
  key: SliderKey;
  label: string;
  min: number;
  max: number;
  step: number;
  decimals: number;
  radialOnly?: boolean;
};

const SLIDERS: ReadonlyArray<SliderDef> = [
  { key: "levelDistance", label: "Level distance", min: 70, max: 320, step: 2, decimals: 0 },
  { key: "siblingSpacing", label: "Sibling spacing", min: 4, max: 46, step: 1, decimals: 0 },
  { key: "armClearance", label: "Arm clearance", min: 1, max: 2.6, step: 0.05, decimals: 2, radialOnly: true },
  { key: "branchCurve", label: "Branch curve", min: 0, max: 0.85, step: 0.05, decimals: 2 },
  { key: "leafSpread", label: "Bubble size", min: 0, max: 1, step: 0.05, decimals: 2, radialOnly: true },
  { key: "leafWrap", label: "Wrap angle", min: 0, max: 1, step: 0.05, decimals: 2, radialOnly: true },
];

export function MindmapControls({
  options,
  onChange,
}: {
  options: MindmapLayoutOptions;
  onChange: (patch: Partial<MindmapLayoutOptions>) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className={panel}>
      <div className={header}>
        <span className={title}>Layout</span>
        <button
          type="button"
          className={collapse}
          aria-expanded={open}
          aria-label={open ? "Collapse layout controls" : "Expand layout controls"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "−" : "+"}
        </button>
      </div>

      {open && (
        <div className={body}>
          <SegmentedControl<MindmapLayoutKind>
            options={LAYOUT_OPTIONS}
            value={options.layout}
            onChange={(layout) => onChange({ layout })}
          />

          {SLIDERS.map((def) => {
            const disabled = def.radialOnly && options.layout !== "radial";
            const current = options[def.key];
            return (
              <div key={def.key} className={field} data-disabled={disabled || undefined}>
                <div className={fieldRow}>
                  <span className={labelClass}>{def.label}</span>
                  <span className={valueClass}>{current.toFixed(def.decimals)}</span>
                </div>
                <input
                  type="range"
                  className={slider}
                  min={def.min}
                  max={def.max}
                  step={def.step}
                  value={current}
                  disabled={disabled}
                  onChange={(e) => onChange({ [def.key]: Number(e.target.value) })}
                  aria-label={def.label}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
