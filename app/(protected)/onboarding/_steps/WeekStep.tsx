"use client";

import { MapPin } from "lucide-react";
import { Button, Switch, Combobox } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import type { WeekDayIntegers } from "@/types/calendarTypes";
import { StepFrame } from "../_components/StepFrame";
import { ALL_WEEK_DAYS, expandDailyRange } from "../_lib/weekTemplates";
import {
  fieldStack,
  fieldLabel,
  fieldHelp,
  timeRow,
  timeInput,
  timeDash,
  dayToggles,
  dayToggle,
  dayToggleOn,
  sectionToggleRow,
  previewNote,
  footerActions,
} from "../onboarding.css";

export type WeekUIState = {
  sleepEnabled: boolean;
  sleepStart: string;
  sleepEnd: string;
  workEnabled: boolean;
  workStart: string;
  workEnd: string;
  workDays: WeekDayIntegers[];
  workLocationId: string | null;
};

const DAY_BUTTONS: { day: WeekDayIntegers; label: string }[] = [
  { day: 1, label: "M" },
  { day: 2, label: "T" },
  { day: 3, label: "W" },
  { day: 4, label: "T" },
  { day: 5, label: "F" },
  { day: 6, label: "S" },
  { day: 0, label: "S" },
];

type WeekStepProps = {
  stepIndex: number;
  totalSteps: number;
  value: WeekUIState;
  onChange: (next: WeekUIState) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
};

export function WeekStep({
  stepIndex,
  totalSteps,
  value,
  onChange,
  onBack,
  onContinue,
  onSkip,
}: WeekStepProps) {
  const { locations } = useCalendarProvider();
  const patch = (next: Partial<WeekUIState>) => onChange({ ...value, ...next });

  const toggleDay = (day: WeekDayIntegers) => {
    const has = value.workDays.includes(day);
    patch({
      workDays: has
        ? value.workDays.filter((d) => d !== day)
        : [...value.workDays, day],
    });
  };

  const sleepBlocks = value.sleepEnabled
    ? expandDailyRange(ALL_WEEK_DAYS, value.sleepStart, value.sleepEnd).length
    : 0;
  const workBlocks = value.workEnabled
    ? expandDailyRange(value.workDays, value.workStart, value.workEnd).length
    : 0;
  const totalBlocks = sleepBlocks + workBlocks;

  return (
    <StepFrame
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      title="Sketch your week"
      subtitle="Two anchors so the first generated week looks like your life. Refine the full grid anytime in Calendar."
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
      <div className={fieldStack}>
        <div className={sectionToggleRow}>
          <span className={fieldLabel}>When do you usually sleep?</span>
          <Switch
            checked={value.sleepEnabled}
            onCheckedChange={(checked) => patch({ sleepEnabled: checked })}
          />
        </div>
        {value.sleepEnabled && (
          <div className={timeRow}>
            <input
              type="time"
              className={timeInput}
              value={value.sleepStart}
              onChange={(e) => patch({ sleepStart: e.target.value })}
            />
            <span className={timeDash}>to</span>
            <input
              type="time"
              className={timeInput}
              value={value.sleepEnd}
              onChange={(e) => patch({ sleepEnd: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className={fieldStack}>
        <div className={sectionToggleRow}>
          <span className={fieldLabel}>Do you have regular working hours?</span>
          <Switch
            checked={value.workEnabled}
            onCheckedChange={(checked) => patch({ workEnabled: checked })}
          />
        </div>
        {value.workEnabled && (
          <>
            <div className={timeRow}>
              <input
                type="time"
                className={timeInput}
                value={value.workStart}
                onChange={(e) => patch({ workStart: e.target.value })}
              />
              <span className={timeDash}>to</span>
              <input
                type="time"
                className={timeInput}
                value={value.workEnd}
                onChange={(e) => patch({ workEnd: e.target.value })}
              />
            </div>
            <div className={dayToggles}>
              {DAY_BUTTONS.map(({ day, label }) => {
                const on = value.workDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    className={`${dayToggle} ${on ? dayToggleOn : ""}`}
                    onClick={() => toggleDay(day)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {locations.length > 0 ? (
              <Combobox<string | null>
                value={value.workLocationId}
                onChange={(v) => patch({ workLocationId: v })}
                options={[
                  { value: null, label: "Anywhere" },
                  ...locations.map((loc) => ({
                    value: loc.id,
                    label: loc.name,
                  })),
                ]}
                renderValue={(opt) =>
                  opt && opt.value ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <MapPin size={12} strokeWidth={2} />
                      {opt.label}
                    </span>
                  ) : (
                    "Anywhere"
                  )
                }
                ariaLabel="Work location"
                width={240}
              />
            ) : (
              <span className={fieldHelp}>
                Add a place on the previous step to attach a location to these
                blocks.
              </span>
            )}
          </>
        )}
      </div>

      {totalBlocks > 0 && (
        <span className={previewNote}>
          This adds {totalBlocks} weekly block{totalBlocks === 1 ? "" : "s"} —
          refine anytime in Calendar.
        </span>
      )}
    </StepFrame>
  );
}
