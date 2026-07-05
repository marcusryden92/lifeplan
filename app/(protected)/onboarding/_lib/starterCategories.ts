import { v4 as uuidv4 } from "uuid";
import type { Category } from "@/types/prisma";

// Swatch hex values (light-theme). Category.color stores a raw hex string; the
// theme's category color resolution derives the dark-mode variant at render.
export type StarterAreaPreset = {
  key: string;
  name: string;
  color: string;
};

export const STARTER_AREA_PRESETS: StarterAreaPreset[] = [
  { key: "career", name: "Career", color: "#3b82f6" },
  { key: "health", name: "Health", color: "#22c55e" },
  { key: "relationships", name: "Relationships", color: "#f43f5e" },
  { key: "finance", name: "Finance", color: "#f59e0b" },
  { key: "growth", name: "Growth", color: "#8b5cf6" },
  { key: "home", name: "Home", color: "#14b8a6" },
  { key: "creative", name: "Creative", color: "#6366f1" },
  { key: "family", name: "Family", color: "#06b6d4" },
];

// Palette custom areas cycle through when the user names their own.
export const CUSTOM_AREA_COLORS: string[] = STARTER_AREA_PRESETS.map(
  (p) => p.color,
);

export type AreaSelection = {
  key: string;
  name: string;
  color: string;
};

// Builds Category rows for the picked areas. Onboarding categories start with
// no time windows (useTimeWindows false) — they carry classification and
// color, and the week/AI steps or later editing add scheduling geometry.
export function buildStarterCategories(
  selections: AreaSelection[],
  userId: string,
  nowIso: string,
  sortOrderStart = 0,
): Category[] {
  return selections.map((selection, index) => ({
    id: uuidv4(),
    name: selection.name.trim(),
    icon: null,
    color: selection.color,
    sortOrder: sortOrderStart + index,
    useTimeWindows: false,
    isStrict: false,
    confineToOwnWindows: false,
    locationId: null,
    parentId: null,
    userId,
    timeSlots: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
}
