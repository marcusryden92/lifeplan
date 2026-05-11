"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { X, Plus } from "lucide-react";
import { CategoryTimeSlot } from "@/types/categoryTypes";
import type { WeekDayIntegers } from "@/types/calendarTypes";

interface TimeSlotEditorProps {
  timeSlots: CategoryTimeSlot[];
  onChange: (slots: CategoryTimeSlot[]) => void;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function TimeSlotEditor({ timeSlots, onChange }: TimeSlotEditorProps) {
  const [selectedDays, setSelectedDays] = useState<WeekDayIntegers[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [error, setError] = useState<string | null>(null);

  // Group time slots by day for display
  const slotsByDay: Record<
    number,
    Array<{ start: string; end: string; slotIndex: number }>
  > = {};

  timeSlots.forEach((slot, slotIndex) => {
    slot.days.forEach((day) => {
      if (!slotsByDay[day]) {
        slotsByDay[day] = [];
      }
      slotsByDay[day].push({
        start: slot.startTime,
        end: slot.endTime,
        slotIndex,
      });
    });
  });

  // Sort slots by start time for each day
  Object.keys(slotsByDay).forEach((day) => {
    slotsByDay[parseInt(day)].sort((a, b) => a.start.localeCompare(b.start));
  });

  const toggleDay = (day: WeekDayIntegers) => {
    if (selectedDays.some((d) => d === day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b));
    }
    setError(null);
  };

  const addTimeSlot = () => {
    if (selectedDays.length === 0 || !startTime || !endTime) return;

    // Check for overlaps or touching slots on any selected day
    for (const day of selectedDays) {
      const existingSlots = slotsByDay[day] || [];

      for (const existing of existingSlots) {
        // Check if slots overlap or touch
        if (
          (startTime < existing.end && endTime > existing.start) || // Overlaps
          startTime === existing.end || // Touches at start
          endTime === existing.start // Touches at end
        ) {
          setError(
            `Time slot overlaps or touches existing slot on ${DAY_NAMES[day]} (${existing.start}-${existing.end}). Please use a different time range or remove the conflicting slot.`
          );
          return;
        }
      }
    }

    // Clear any previous error
    setError(null);

    // Create a new time slot with the selected days
    const newSlot: CategoryTimeSlot = {
      days: selectedDays,
      startTime,
      endTime,
    };

    onChange([...timeSlots, newSlot]);
    setSelectedDays([]);
    setStartTime("09:00");
    setEndTime("17:00");
  };

  const removeTimeSlot = (day: WeekDayIntegers, timeStart: string, timeEnd: string) => {
    const updatedSlots: CategoryTimeSlot[] = [];

    timeSlots.forEach((slot) => {
      if (
        slot.days.some((d) => d === day) &&
        slot.startTime === timeStart &&
        slot.endTime === timeEnd
      ) {
        // Remove this day from the slot
        const remainingDays = slot.days.filter((d) => d !== day);
        if (remainingDays.length > 0) {
          // Keep the slot with remaining days
          updatedSlots.push({
            ...slot,
            days: remainingDays,
          });
        }
        // If no days remain, don't add it (effectively deletes it)
      } else {
        // Keep slots that don't match
        updatedSlots.push(slot);
      }
    });

    onChange(updatedSlots);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label>Time Constraints</Label>
        <p className="text-sm text-muted-foreground">
          Select days and add time slots when items in this category can be
          scheduled
        </p>

        {/* Error message */}
        {error && (
          <div className="p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Add new time slot */}
        <div className="p-4 border rounded-md space-y-3 bg-gray-50/50">
          {/* Day selector - always visible */}
          <div>
            <Label className="text-sm mb-2 block">Select Days</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_NAMES.map((name, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index as WeekDayIntegers)}
                  className={`px-1 py-2.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                    selectedDays.some((d) => d === index)
                      ? "bg-blue-500 text-white"
                      : "bg-white border hover:bg-gray-50"
                  }`}
                  title={name}
                >
                  {name.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Existing time slots - horizontally aligned under day buttons */}
          {Object.keys(slotsByDay).length > 0 && (
            <div className="max-h-[180px] overflow-y-auto">
              <div className="grid grid-cols-7 gap-1.5">
                {([0, 1, 2, 3, 4, 5, 6] as WeekDayIntegers[]).map((day) => {
                  const slots = slotsByDay[day] || [];

                  return (
                    <div key={day} className="space-y-1 min-h-[20px]">
                      {slots.map((slot, idx) => (
                        <div
                          key={idx}
                          className="relative bg-white rounded border p-1 group hover:border-red-300"
                        >
                          <div className="text-center">
                            <div className="text-[10px] text-gray-600 leading-tight">
                              {slot.start}
                            </div>
                            <div className="text-[10px] text-gray-600 leading-tight">
                              {slot.end}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              removeTimeSlot(day, slot.start, slot.end)
                            }
                            className="absolute right-0.5 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Time inputs - always visible */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm mb-1 block">Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-sm mb-1 block">End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTimeSlot}
            disabled={selectedDays.length === 0}
            className="w-full gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Time Slot
          </Button>
        </div>
      </div>
    </div>
  );
}
