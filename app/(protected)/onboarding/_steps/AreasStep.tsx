"use client";

import { useState, type CSSProperties } from "react";
import { GripVertical, Plus, X } from "lucide-react";
import { Button } from "@/components/ui";
import { StepFrame } from "../_components/StepFrame";
import {
  STARTER_AREA_PRESETS,
  CUSTOM_AREA_COLORS,
  type AreaSelection,
} from "../_lib/starterCategories";
import {
  areasColumns,
  areaColumn,
  areaColumnTitle,
  areaRow,
  areaRowLabel,
  areaRowIcon,
  areaRowSelected,
  areaRowDragging,
  areaRowGrip,
  areaRowRemove,
  areaEmptyNote,
  customRow,
  input,
  selectionCaption,
  footerActions,
} from "../onboarding.css";

type AreasStepProps = {
  stepIndex: number;
  totalSteps: number;
  selections: AreaSelection[];
  onChange: (next: AreaSelection[]) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
};

function areaColorVar(color: string): CSSProperties {
  return { ["--area-color"]: color } as CSSProperties;
}

export function AreasStep({
  stepIndex,
  totalSteps,
  selections,
  onChange,
  onBack,
  onContinue,
  onSkip,
}: AreasStepProps) {
  const [customName, setCustomName] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const selectedKeys = new Set(selections.map((s) => s.key));

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...selections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const addPreset = (key: string, name: string, color: string) => {
    if (selectedKeys.has(key)) return;
    onChange([...selections, { key, name, color }]);
  };

  const removeSelection = (key: string) => {
    onChange(selections.filter((s) => s.key !== key));
  };

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    const key = `custom:${name.toLowerCase()}`;
    if (selectedKeys.has(key)) {
      setCustomName("");
      return;
    }
    const color =
      CUSTOM_AREA_COLORS[selections.length % CUSTOM_AREA_COLORS.length];
    onChange([...selections, { key, name, color }]);
    setCustomName("");
  };

  const availablePresets = STARTER_AREA_PRESETS.filter(
    (preset) => !selectedKeys.has(preset.key),
  );

  return (
    <StepFrame
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      title="Pick your life areas"
      subtitle="The broad parts of your life worth planning around. Sub-areas can be added later."
      onSkip={onSkip}
      footer={
        <>
          <Button variant="glass" onClick={onBack}>
            Back
          </Button>
          <div className={footerActions}>
            <Button variant="glassInk" onClick={onContinue}>
              Continue
            </Button>
          </div>
        </>
      }
    >
      <div className={areasColumns}>
        <div className={areaColumn}>
          <span className={areaColumnTitle}>Suggestions</span>
          {availablePresets.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={areaRow}
              style={areaColorVar(preset.color)}
              onClick={() => addPreset(preset.key, preset.name, preset.color)}
            >
              <span className={areaRowLabel}>{preset.name}</span>
              <span className={areaRowIcon}>
                <Plus size={15} strokeWidth={2.2} />
              </span>
            </button>
          ))}
        </div>

        <div className={areaColumn}>
          <span className={areaColumnTitle}>Your areas</span>
          {selections.length === 0 ? (
            <span className={areaEmptyNote}>
              Nothing yet — add from the left or type your own.
            </span>
          ) : (
            selections.map((sel, i) => (
              <div
                key={sel.key}
                className={`${areaRow} ${areaRowSelected} ${
                  dragIndex === i ? areaRowDragging : ""
                }`}
                style={areaColorVar(sel.color)}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragEnd={() => setDragIndex(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null) reorder(dragIndex, i);
                  setDragIndex(null);
                }}
              >
                <span className={areaRowGrip} aria-hidden>
                  <GripVertical size={14} strokeWidth={2} />
                </span>
                <span className={areaRowLabel}>{sel.name}</span>
                <button
                  type="button"
                  className={areaRowRemove}
                  onClick={() => removeSelection(sel.key)}
                  aria-label={`Remove ${sel.name}`}
                >
                  <X size={15} strokeWidth={2.2} />
                </button>
              </div>
            ))
          )}

          <div className={customRow}>
            <input
              className={input}
              placeholder="Add your own…"
              value={customName}
              maxLength={40}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <Button
              variant="glass"
              size="sm"
              onClick={addCustom}
              disabled={!customName.trim()}
            >
              Add
            </Button>
          </div>

          <span className={selectionCaption}>
            {selections.length === 0
              ? "None selected yet"
              : `${selections.length} selected`}
          </span>
        </div>
      </div>
    </StepFrame>
  );
}
