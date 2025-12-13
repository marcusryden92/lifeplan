"use client";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import {
  setDebugDashboardEnabled,
  setStrategyWeights,
  setLocationGroupingScores,
  setLocationGroupingPenalties,
  setUrgencyScores,
  resetStrategyConfig,
} from "@/redux/slices/schedulingSettingsSlice";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { Label } from "@/components/ui/Label";
import { Checkbox } from "@/components/ui/Checkbox";
import { ChevronDown, ChevronUp, RotateCcw, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type SliderConfig = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
};

function SliderRow({ config }: { config: SliderConfig }) {
  return (
    <div className="flex items-center gap-3">
      <Label className="w-36 text-xs text-muted-foreground shrink-0">
        {config.label}
      </Label>
      <Slider
        value={[config.value]}
        min={config.min}
        max={config.max}
        step={config.step}
        onValueChange={([v]) => config.onChange(v)}
        className="flex-1 min-w-0"
      />
      <span className="w-14 text-xs text-right font-mono shrink-0">
        {config.value.toFixed(2)}
      </span>
    </div>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-sm font-medium text-left hover:bg-muted/50 px-2 -mx-2 rounded"
      >
        {title}
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {isOpen && <div className="space-y-3 pb-3">{children}</div>}
    </div>
  );
}

export default function StrategyDebugDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { manuallyRefreshCalendar } = useCalendarProvider();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const isFirstRender = useRef(true);

  const { debugDashboardEnabled, debugStrategyConfig } = useSelector(
    (state: RootState) => state.schedulingSettings
  );

  const { weights, locationGrouping, urgency } = debugStrategyConfig;

  // Auto-refresh effect: triggers AFTER React has re-rendered with new config values
  // This ensures the stateRef in useManuallyRefreshCalendar has the updated values
  useEffect(() => {
    // Skip the first render to avoid refreshing on mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (autoRefresh && debugDashboardEnabled) {
      manuallyRefreshCalendar();
    }
  }, [
    debugStrategyConfig,
    autoRefresh,
    debugDashboardEnabled,
    manuallyRefreshCalendar,
  ]);

  if (!debugDashboardEnabled) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch(setDebugDashboardEnabled(true))}
          className="shadow-lg"
        >
          Settings
        </Button>
      </div>
    );
  }

  const handleRefresh = () => {
    manuallyRefreshCalendar();
  };

  const handleReset = () => {
    dispatch(resetStrategyConfig());
    manuallyRefreshCalendar();
  };

  const weightSliders: SliderConfig[] = [
    {
      key: "urgency",
      label: "Urgency",
      min: 0,
      max: 2,
      step: 0.1,
      value: weights.urgency,
      onChange: (v) => dispatch(setStrategyWeights({ urgency: v })),
    },
    {
      key: "earliestSlot",
      label: "Earliest Slot",
      min: 0,
      max: 2,
      step: 0.1,
      value: weights.earliestSlot,
      onChange: (v) => dispatch(setStrategyWeights({ earliestSlot: v })),
    },
    {
      key: "locationGrouping",
      label: "Location Grouping",
      min: 0,
      max: 2,
      step: 0.1,
      value: weights.locationGrouping,
      onChange: (v) => dispatch(setStrategyWeights({ locationGrouping: v })),
    },
  ];

  const locationScoreSliders: SliderConfig[] = [
    {
      key: "bothMatch",
      label: "Both Match",
      min: 0,
      max: 1,
      step: 0.05,
      value: locationGrouping.scores.bothMatch,
      onChange: (v) => dispatch(setLocationGroupingScores({ bothMatch: v })),
    },
    {
      key: "oneMatchOneOpen",
      label: "One Match, One Open",
      min: 0,
      max: 1,
      step: 0.05,
      value: locationGrouping.scores.oneMatchOneOpen,
      onChange: (v) =>
        dispatch(setLocationGroupingScores({ oneMatchOneOpen: v })),
    },
    {
      key: "oneMatch",
      label: "One Match",
      min: 0,
      max: 1,
      step: 0.05,
      value: locationGrouping.scores.oneMatch,
      onChange: (v) => dispatch(setLocationGroupingScores({ oneMatch: v })),
    },
    {
      key: "bothOpen",
      label: "Both Open",
      min: 0,
      max: 1,
      step: 0.05,
      value: locationGrouping.scores.bothOpen,
      onChange: (v) => dispatch(setLocationGroupingScores({ bothOpen: v })),
    },
    {
      key: "oneOpenNoMatch",
      label: "One Open, No Match",
      min: 0,
      max: 1,
      step: 0.05,
      value: locationGrouping.scores.oneOpenNoMatch,
      onChange: (v) =>
        dispatch(setLocationGroupingScores({ oneOpenNoMatch: v })),
    },
    {
      key: "neitherMatch",
      label: "Neither Match",
      min: 0,
      max: 1,
      step: 0.05,
      value: locationGrouping.scores.neitherMatch,
      onChange: (v) => dispatch(setLocationGroupingScores({ neitherMatch: v })),
    },
    {
      key: "insufficientRoom",
      label: "Insufficient Room",
      min: 0,
      max: 1,
      step: 0.05,
      value: locationGrouping.scores.insufficientRoom,
      onChange: (v) =>
        dispatch(setLocationGroupingScores({ insufficientRoom: v })),
    },
    {
      key: "noLocation",
      label: "No Location",
      min: 0,
      max: 1,
      step: 0.05,
      value: locationGrouping.scores.noLocation,
      onChange: (v) => dispatch(setLocationGroupingScores({ noLocation: v })),
    },
  ];

  const penaltySliders: SliderConfig[] = [
    {
      key: "maxSingleTravelPenalty",
      label: "Max Single Penalty",
      min: 0,
      max: 0.2,
      step: 0.01,
      value: locationGrouping.penalties.maxSingleTravelPenalty,
      onChange: (v) =>
        dispatch(setLocationGroupingPenalties({ maxSingleTravelPenalty: v })),
    },
    {
      key: "maxDoubleTravelPenalty",
      label: "Max Double Penalty",
      min: 0,
      max: 0.2,
      step: 0.01,
      value: locationGrouping.penalties.maxDoubleTravelPenalty,
      onChange: (v) =>
        dispatch(setLocationGroupingPenalties({ maxDoubleTravelPenalty: v })),
    },
    {
      key: "singleTravelPenaltyDivisor",
      label: "Single Penalty Divisor",
      min: 100,
      max: 1000,
      step: 50,
      value: locationGrouping.penalties.singleTravelPenaltyDivisor,
      onChange: (v) =>
        dispatch(
          setLocationGroupingPenalties({ singleTravelPenaltyDivisor: v })
        ),
    },
    {
      key: "doubleTravelPenaltyDivisor",
      label: "Double Penalty Divisor",
      min: 100,
      max: 1000,
      step: 50,
      value: locationGrouping.penalties.doubleTravelPenaltyDivisor,
      onChange: (v) =>
        dispatch(
          setLocationGroupingPenalties({ doubleTravelPenaltyDivisor: v })
        ),
    },
  ];

  const urgencySliders: SliderConfig[] = [
    {
      key: "urgencyScoreWeight",
      label: "Urgency Score Weight",
      min: 0,
      max: 1,
      step: 0.1,
      value: urgency.urgencyScoreWeight,
      onChange: (v) => dispatch(setUrgencyScores({ urgencyScoreWeight: v })),
    },
    {
      key: "timePreferenceWeight",
      label: "Time Preference Weight",
      min: 0,
      max: 1,
      step: 0.1,
      value: urgency.timePreferenceWeight,
      onChange: (v) => dispatch(setUrgencyScores({ timePreferenceWeight: v })),
    },
    {
      key: "noDeadlineMaxDays",
      label: "No Deadline Max Days",
      min: 7,
      max: 180,
      step: 7,
      value: urgency.noDeadlineMaxDays,
      onChange: (v) => dispatch(setUrgencyScores({ noDeadlineMaxDays: v })),
    },
    {
      key: "noDeadlineDecayFactor",
      label: "No Deadline Decay",
      min: 0,
      max: 1,
      step: 0.1,
      value: urgency.noDeadlineDecayFactor,
      onChange: (v) => dispatch(setUrgencyScores({ noDeadlineDecayFactor: v })),
    },
    {
      key: "urgentRatioThreshold",
      label: "Urgent Ratio Threshold",
      min: 0,
      max: 1,
      step: 0.05,
      value: urgency.urgentRatioThreshold,
      onChange: (v) => dispatch(setUrgencyScores({ urgentRatioThreshold: v })),
    },
    {
      key: "minTimePreference",
      label: "Min Time Preference",
      min: 0,
      max: 1,
      step: 0.1,
      value: urgency.minTimePreference,
      onChange: (v) => dispatch(setUrgencyScores({ minTimePreference: v })),
    },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[420px] max-h-[80vh] bg-background/80 backdrop-blur-sm border rounded-lg shadow-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">Strategy Debug</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            title="Reset to defaults"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch(setDebugDashboardEnabled(false))}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
        <CollapsibleSection title="Strategy Weights" defaultOpen={true}>
          {weightSliders.map((config) => (
            <SliderRow key={config.key} config={config} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Location Grouping Scores">
          {locationScoreSliders.map((config) => (
            <SliderRow key={config.key} config={config} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Location Penalties">
          {penaltySliders.map((config) => (
            <SliderRow key={config.key} config={config} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Urgency Settings">
          {urgencySliders.map((config) => (
            <SliderRow key={config.key} config={config} />
          ))}
        </CollapsibleSection>
      </div>

      <div className="p-3 border-t bg-muted/30 space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={(checked) => setAutoRefresh(checked === true)}
          />
          <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">
            Automatically refresh
          </Label>
        </div>
        <Button
          onClick={handleRefresh}
          className={`w-full ${autoRefresh ? "opacity-50" : ""}`}
          size="sm"
          disabled={autoRefresh}
        >
          Apply & Refresh Calendar
        </Button>
      </div>
    </div>
  );
}
