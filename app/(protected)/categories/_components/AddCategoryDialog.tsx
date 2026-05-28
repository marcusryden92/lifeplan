"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button.legacy";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import { MapPin } from "lucide-react";
import { LocationSelector } from "@/components/locations/LocationSelector";

const EMOJI_OPTIONS = [
  "💼",
  "💰",
  "🎯",
  "📚",
  "🏃",
  "❤️",
  "👨‍👩‍👧",
  "🏠",
  "🚗",
  "✈️",
  "🎨",
  "🎵",
  "📱",
  "💻",
  "🔧",
  "🌱",
  "🧘",
  "🍎",
  "💪",
  "🧠",
];

const COLOR_OPTIONS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
];

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: {
    name: string;
    icon?: string;
    color?: string;
    parentId?: string;
    isStrict?: boolean;
    locationId?: string | null;
  }) => void;
  parentId?: string;
  parentName?: string;
}

export function AddCategoryDialog({
  open,
  onOpenChange,
  onAdd,
  parentId,
  parentName,
}: AddCategoryDialogProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | undefined>();
  const [color, setColor] = useState<string | undefined>();
  const [isStrict, setIsStrict] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      icon,
      color,
      parentId,
      isStrict,
      locationId,
    });

    setName("");
    setIcon(undefined);
    setColor(undefined);
    setIsStrict(false);
    setLocationId(null);
    setShowAdvanced(false);
  };

  const handleClose = () => {
    setName("");
    setIcon(undefined);
    setColor(undefined);
    setIsStrict(false);
    setLocationId(null);
    setShowAdvanced(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col h-full overflow-hidden"
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {parentId ? "Add Subcategory" : "Add Life Area"}
            </DialogTitle>
            <DialogDescription>
              {parentId
                ? `Create a new subcategory under "${parentName}"`
                : "Create a new top-level category to organize your goals and tasks"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 overflow-y-auto flex-1 min-h-0">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={parentId ? "e.g., Job Search" : "e.g., Career"}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label>Icon (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(icon === emoji ? undefined : emoji)}
                    className={`w-9 h-9 text-lg rounded-md border transition-colors ${
                      icon === emoji
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Color (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(color === c ? undefined : c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      color === c
                        ? "border-gray-800 scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full"
            >
              {showAdvanced ? "Hide" : "Show"} Advanced Options
            </Button>

            {showAdvanced && (
              <div className="space-y-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Default Location
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Items in this category without a location will inherit this
                    (or parent category&apos;s) location
                  </p>
                  <LocationSelector
                    value={locationId}
                    onChange={setLocationId}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <div className="space-y-0.5">
                    <Label htmlFor="strict-mode">Strict Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Only items from this category can be scheduled in this
                      category&apos;s time windows
                    </p>
                  </div>
                  <Switch
                    id="strict-mode"
                    checked={isStrict}
                    onCheckedChange={setIsStrict}
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Time windows for this category are set from the Configure Time
              Windows view on the categories page after creation.
            </p>
          </div>

          <DialogFooter className="mt-4 flex-shrink-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {parentId ? "Add Subcategory" : "Add Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
