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
  locationOption,
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
  exerciseEnabled: boolean;
  exerciseStart: string;
  exerciseEnd: string;
  exerciseDays: WeekDayIntegers[];
  morningEnabled: boolean;
  morningStart: string;
  morningEnd: string;
  eveningEnabled: boolean;
  eveningStart: string;
  eveningEnd: string;
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

  const toggleDayIn = (
    key: "workDays" | "exerciseDays",
    day: WeekDayIntegers,
  ) => {
    const current = value[key];
    patch({
      [key]: current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day],
    });
  };

  const sleepBlocks = value.sleepEnabled
    ? expandDailyRange(ALL_WEEK_DAYS, value.sleepStart, value.sleepEnd).length
    : 0;
  const workBlocks = value.workEnabled
    ? expandDailyRange(value.workDays, value.workStart, value.workEnd).length
    : 0;
  const exerciseBlocks = value.exerciseEnabled
    ? expandDailyRange(
        value.exerciseDays,
        value.exerciseStart,
        value.exerciseEnd,
        false,
      ).length
    : 0;
  const morningBlocks = value.morningEnabled
    ? expandDailyRange(
        ALL_WEEK_DAYS,
        value.morningStart,
        value.morningEnd,
        false,
      ).length
    : 0;
  const eveningBlocks = value.eveningEnabled
    ? expandDailyRange(
        ALL_WEEK_DAYS,
        value.eveningStart,
        value.eveningEnd,
        false,
      ).length
    : 0;
  const totalBlocks =
    sleepBlocks + workBlocks + exerciseBlocks + morningBlocks + eveningBlocks;

  return (
    <StepFrame
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      title="Sketch your week"
      subtitle="A few anchors so the first generated week looks like your life. Refine the full grid anytime in Calendar."
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
                    onClick={() => toggleDayIn("workDays", day)}
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
                    <span className={locationOption}>
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

      <div className={fieldStack}>
        <div className={sectionToggleRow}>
          <span className={fieldLabel}>Do you exercise on set days?</span>
          <Switch
            checked={value.exerciseEnabled}
            onCheckedChange={(checked) => patch({ exerciseEnabled: checked })}
          />
        </div>
        {value.exerciseEnabled && (
          <>
            <div className={timeRow}>
              <input
                type="time"
                className={timeInput}
                value={value.exerciseStart}
                onChange={(e) => patch({ exerciseStart: e.target.value })}
              />
              <span className={timeDash}>to</span>
              <input
                type="time"
                className={timeInput}
                value={value.exerciseEnd}
                onChange={(e) => patch({ exerciseEnd: e.target.value })}
              />
            </div>
            <div className={dayToggles}>
              {DAY_BUTTONS.map(({ day, label }) => {
                const on = value.exerciseDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    className={`${dayToggle} ${on ? dayToggleOn : ""}`}
                    onClick={() => toggleDayIn("exerciseDays", day)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className={fieldStack}>
        <div className={sectionToggleRow}>
          <span className={fieldLabel}>A morning routine?</span>
          <Switch
            checked={value.morningEnabled}
            onCheckedChange={(checked) => patch({ morningEnabled: checked })}
          />
        </div>
        {value.morningEnabled && (
          <div className={timeRow}>
            <input
              type="time"
              className={timeInput}
              value={value.morningStart}
              onChange={(e) => patch({ morningStart: e.target.value })}
            />
            <span className={timeDash}>to</span>
            <input
              type="time"
              className={timeInput}
              value={value.morningEnd}
              onChange={(e) => patch({ morningEnd: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className={fieldStack}>
        <div className={sectionToggleRow}>
          <span className={fieldLabel}>An evening routine?</span>
          <Switch
            checked={value.eveningEnabled}
            onCheckedChange={(checked) => patch({ eveningEnabled: checked })}
          />
        </div>
        {value.eveningEnabled && (
          <div className={timeRow}>
            <input
              type="time"
              className={timeInput}
              value={value.eveningStart}
              onChange={(e) => patch({ eveningStart: e.target.value })}
            />
            <span className={timeDash}>to</span>
            <input
              type="time"
              className={timeInput}
              value={value.eveningEnd}
              onChange={(e) => patch({ eveningEnd: e.target.value })}
            />
          </div>
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
