"use client";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import {
  setDebugDashboardEnabled,
  setStrategyWeights,
  resetStrategyConfig,
} from "@/redux/slices/schedulingSettingsSlice";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { Label } from "@/components/ui/Label";
import { Checkbox } from "@/components/ui/Checkbox";
import { RotateCcw, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

type SliderConfig = {
  key: string;
  label: string;
  min: number;
  max: number;
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
        step={0.01}
        onValueChange={([v]) => config.onChange(v)}
        className="flex-1 min-w-0"
      />
      <span className="w-14 text-xs text-right font-mono shrink-0">
        {config.value.toFixed(2)}
      </span>
    </div>
  );
}

export default function StrategyDebugDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { manuallyRefreshCalendar } = useCalendarProvider();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const isFirstRender = useRef(true);

  const { debugDashboardEnabled, debugStrategyConfig } = useSelector(
    (state: RootState) => state.schedulingSettings
  );

  const { weights } = debugStrategyConfig;

  // Debounced auto-refresh: waits 50ms after last change before refreshing calendar
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedRefresh = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      manuallyRefreshCalendar();
    }, 50);
  }, [manuallyRefreshCalendar]);

  // Auto-refresh effect: triggers AFTER React has re-rendered with new config values
  useEffect(() => {
    // Skip the first render to avoid refreshing on mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (autoRefresh && debugDashboardEnabled) {
      debouncedRefresh();
    }
  }, [
    debugStrategyConfig,
    autoRefresh,
    debugDashboardEnabled,
    debouncedRefresh,
  ]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

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
      key: "earliestSlot",
      label: "Earliest Slot",
      min: 0,
      max: 2,
      value: weights.earliestSlot,
      onChange: (v) => dispatch(setStrategyWeights({ earliestSlot: v })),
    },
    {
      key: "locationGrouping",
      label: "Location Grouping",
      min: 0,
      max: 0.5,
      value: weights.locationGrouping,
      onChange: (v) => dispatch(setStrategyWeights({ locationGrouping: v })),
    },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[420px] max-h-[80vh] bg-background/80 backdrop-blur-sm border rounded-lg shadow-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">Strategy Settings</h3>
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3">
        {weightSliders.map((config) => (
          <SliderRow key={config.key} config={config} />
        ))}
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
