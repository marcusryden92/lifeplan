"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { LocationSelector } from "@/components/locations/LocationSelector";
import { TimeSlotEditor } from "./TimeSlotEditor";
import { CategoryTimeWindow } from "@/types/categoryTypes";
import type { Category } from "@/types/prisma";

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    timeSlots?: CategoryTimeWindow[];
    isStrict?: boolean;
    locationId?: string | null;
  }) => void;
  category: Category | null;
}

export function EditCategoryDialog({
  open,
  onOpenChange,
  onSave,
  category,
}: EditCategoryDialogProps) {
  const [name, setName] = useState("");
  const [timeSlots, setTimeSlots] = useState<CategoryTimeWindow[]>([]);
  const [isStrict, setIsStrict] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);

      const mappedSlots: CategoryTimeWindow[] = category.timeSlots.map((ts) => ({
        days: ts.days,
        startTime: ts.startTime,
        endTime: ts.endTime,
      }));
      setTimeSlots(mappedSlots);

      setIsStrict(category.isStrict || false);
      setLocationId(category.locationId || null);

      setShowAdvanced(mappedSlots.length > 0 || !!category.locationId);
    }
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      timeSlots: timeSlots.length > 0 ? timeSlots : undefined,
      isStrict,
      locationId,
    });

    handleClose();
  };

  const handleClose = () => {
    setName("");
    setTimeSlots([]);
    setIsStrict(false);
    setLocationId(null);
    setShowAdvanced(false);
    onOpenChange(false);
  };

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col h-full overflow-hidden"
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update the category settings</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 overflow-y-auto flex-1 min-h-0">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Career"
                autoFocus
              />
            </div>

            {/* Advanced Options Toggle */}
            <div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full justify-between p-3 h-auto hover:bg-gray-50"
              >
                <span className="font-medium">Advanced Options</span>
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>

              {showAdvanced && (
                <div className="mt-4 space-y-6 p-4 border rounded-md bg-gray-50/50">
                  {/* Location Assignment */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <Label>Default Location</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All items in this category will inherit this location
                      unless overridden
                    </p>
                    <LocationSelector
                      value={locationId}
                      onChange={setLocationId}
                    />
                  </div>

                  {/* Time Constraints */}
                  <div className="space-y-3">
                    <TimeSlotEditor
                      timeSlots={timeSlots}
                      onChange={setTimeSlots}
                    />

                    {/* Strict Mode Toggle */}
                    {timeSlots.length > 0 && (
                      <div className="flex items-center justify-between p-3 border rounded-md bg-white">
                        <div className="space-y-0.5">
                          <Label>Strict Mode</Label>
                          <p className="text-xs text-muted-foreground">
                            No other items can be scheduled during category time
                            slots
                          </p>
                        </div>
                        <Switch
                          checked={isStrict}
                          onCheckedChange={setIsStrict}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4 flex-shrink-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
