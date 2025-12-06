"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/PopOver";
import type { TravelTime } from "@/types/prisma";

type TimePeriod = "rush" | "regular" | "night";

interface TravelTimeCellProps {
  travelTime: TravelTime;
  effectiveMinutes: number;
  googleMinutes: number;
  hasOverride: boolean;
  period: TimePeriod;
  onUpdateOverride: (
    travelTimeId: string,
    period: TimePeriod,
    value: number | null
  ) => Promise<void>;
}

export function TravelTimeCell({
  travelTime,
  effectiveMinutes,
  googleMinutes,
  hasOverride,
  period,
  onUpdateOverride,
}: TravelTimeCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(effectiveMinutes.toString());
  const [saving, setSaving] = useState(false);

  const handleOpen = (open: boolean) => {
    if (open) {
      setEditValue(effectiveMinutes.toString());
    }
    setIsOpen(open);
  };

  const handleSave = async () => {
    const newValue = parseInt(editValue);
    if (isNaN(newValue) || newValue < 0) return;

    // If the value is the same as Google's, set to null (remove override)
    const valueToSave = newValue === googleMinutes ? null : newValue;

    try {
      setSaving(true);
      await onUpdateOverride(travelTime.id, period, valueToSave);
      setIsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = async () => {
    try {
      setSaving(true);
      await onUpdateOverride(travelTime.id, period, null);
      setEditValue(googleMinutes.toString());
      setIsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <td className="border p-0">
      <Popover open={isOpen} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <button
            className={`w-full h-full p-2 text-center hover:bg-accent transition-colors ${
              hasOverride ? "bg-amber-50 font-medium" : ""
            }`}
          >
            {effectiveMinutes}
            {hasOverride && <span className="text-amber-600">*</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="center">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="travelTime">Travel Time (minutes)</Label>
              <Input
                id="travelTime"
                type="number"
                min="0"
                max="999"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setIsOpen(false);
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Google estimate: {googleMinutes} min
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className="flex-1"
              >
                {saving ? "Saving..." : "Save"}
              </Button>

              {hasOverride && (
                <Button
                  onClick={handleRevert}
                  disabled={saving}
                  variant="outline"
                  size="sm"
                  className="gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Revert
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </td>
  );
}
