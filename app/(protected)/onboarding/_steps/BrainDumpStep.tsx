"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button, SegmentedControl } from "@/components/ui";
import { TYPE_OPTIONS, type TriageType } from "@/app/(protected)/capture/_constants";
import { StepFrame } from "../_components/StepFrame";
import type { DumpItem } from "../_lib/brainDumpRows";
import {
  dumpList,
  dumpRow,
  dumpRowTitle,
  dumpRowControl,
  dumpRemove,
  dumpEmpty,
  customRow,
  input,
  footerActions,
} from "../onboarding.css";

type BrainDumpStepProps = {
  stepIndex: number;
  totalSteps: number;
  items: DumpItem[];
  onChange: (next: DumpItem[]) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
  continueDisabled?: boolean;
};

const TYPE_SEGMENTS = TYPE_OPTIONS.map((o) => ({ key: o.key, label: o.label }));

export function BrainDumpStep({
  stepIndex,
  totalSteps,
  items,
  onChange,
  onBack,
  onContinue,
  onSkip,
  continueDisabled = false,
}: BrainDumpStepProps) {
  const [jot, setJot] = useState("");

  const addItem = () => {
    const title = jot.trim();
    if (!title) return;
    onChange([...items, { id: uuidv4(), title, type: "task" }]);
    setJot("");
  };

  const setType = (id: string, type: TriageType) => {
    onChange(items.map((it) => (it.id === id ? { ...it, type } : it)));
  };

  const removeItem = (id: string) => {
    onChange(items.filter((it) => it.id !== id));
  };

  return (
    <StepFrame
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      title="Empty your head"
      subtitle="Jot whatever you want to get done or make progress on. Mark each as a task, a fixed plan, or a goal. Roles, deadlines, and the details come next with the assistant."
      onSkip={onSkip}
      footer={
        <>
          <Button variant="glass" onClick={onBack}>
            Back
          </Button>
          <div className={footerActions}>
            <Button
              variant="glassInk"
              onClick={onContinue}
              disabled={continueDisabled}
            >
              Continue
            </Button>
          </div>
        </>
      }
    >
      <div className={customRow}>
        <input
          className={input}
          placeholder="Add something…"
          value={jot}
          maxLength={120}
          onChange={(e) => setJot(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button
          variant="glass"
          size="sm"
          onClick={addItem}
          disabled={!jot.trim()}
        >
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <span className={dumpEmpty}>Nothing yet — jot your first item above.</span>
      ) : (
        <div className={dumpList}>
          {items.map((item) => (
            <div key={item.id} className={dumpRow}>
              <span className={dumpRowTitle}>{item.title}</span>
              <span className={dumpRowControl}>
                <SegmentedControl<TriageType>
                  options={TYPE_SEGMENTS}
                  value={item.type}
                  onChange={(next) => setType(item.id, next)}
                />
              </span>
              <button
                type="button"
                className={dumpRemove}
                onClick={() => removeItem(item.id)}
                aria-label="Remove"
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </StepFrame>
  );
}
