import type { Category, CategoryTimeWindow } from "@/types/prisma";
import type { WeekDayIntegers } from "@/types/calendarTypes";
import type {
  DraftCategorySettings,
  DraftTimeWindow,
  DraftWindowsState,
} from "./draftWindows";

interface ApplyWindowsArgs {
  // The provider's live category array at Save time.
  currentCategories: Category[];
  // Snapshot taken when the modal opened.
  canonical: DraftWindowsState;
  working: DraftWindowsState;
  userId: string;
  now: string;
}

function windowFieldsEqual(
  row: CategoryTimeWindow,
  draft: DraftTimeWindow,
): boolean {
  return (
    row.categoryId === draft.categoryId &&
    row.day === draft.day &&
    row.startTime === draft.startTime &&
    row.endTime === draft.endTime
  );
}

function settingsDiffer(
  a: DraftCategorySettings,
  b: DraftCategorySettings,
): boolean {
  return a.useTimeWindows !== b.useTimeWindows || a.isStrict !== b.isStrict;
}

// Materializes the assistant's working windows state against the live
// category array. CategoryTimeWindow rows carry no timestamps, so the sync
// diff is purely value-based — object identity here is render-churn hygiene,
// not load-bearing like templates. The category row itself IS compared with
// updatedAt included (timeSlots stripped), so flag changes restamp updatedAt
// and window-only changes must not touch the category's own fields.
export function applyDraftWindows({
  currentCategories,
  canonical,
  working,
  userId,
  now,
}: ApplyWindowsArgs): Category[] {
  const canonicalWindowIds = new Set(canonical.windows.map((w) => w.id));
  const workingWindowsById = new Map(working.windows.map((w) => [w.id, w]));
  const canonicalSettingsById = new Map(
    canonical.settings.map((s) => [s.id, s]),
  );
  const workingSettingsById = new Map(working.settings.map((s) => [s.id, s]));

  // Distribute rows into their target categories first — an update can
  // reparent a window, so its destination may differ from where it lives now.
  const rowsByCategory = new Map<string, CategoryTimeWindow[]>();
  const place = (categoryId: string, row: CategoryTimeWindow) => {
    const list = rowsByCategory.get(categoryId);
    if (list) list.push(row);
    else rowsByCategory.set(categoryId, [row]);
  };

  const currentWindowIds = new Set<string>();
  for (const category of currentCategories) {
    for (const row of category.timeSlots) {
      currentWindowIds.add(row.id);
      const draft = workingWindowsById.get(row.id);
      if (!draft) {
        // Deleted by the assistant if it saw the row; otherwise a concurrent
        // row created elsewhere while the modal was open — preserved.
        if (!canonicalWindowIds.has(row.id)) place(row.categoryId ?? "", row);
        continue;
      }
      if (windowFieldsEqual(row, draft)) {
        place(draft.categoryId, row);
      } else {
        place(draft.categoryId, {
          ...row,
          categoryId: draft.categoryId,
          day: draft.day as WeekDayIntegers,
          startTime: draft.startTime,
          endTime: draft.endTime,
        });
      }
    }
  }

  for (const draft of working.windows) {
    if (currentWindowIds.has(draft.id)) continue;
    place(draft.categoryId, {
      id: draft.id,
      categoryId: draft.categoryId,
      day: draft.day as WeekDayIntegers,
      startTime: draft.startTime,
      endTime: draft.endTime,
      userId,
    });
  }

  return currentCategories.map((category) => {
    const nextSlots = rowsByCategory.get(category.id) ?? [];

    const workingSetting = workingSettingsById.get(category.id);
    const canonicalSetting = canonicalSettingsById.get(category.id);
    // Only a flag delta the assistant actually made wins over the live row —
    // if it left flags alone, edits made elsewhere while the modal was open
    // stay in place.
    const flagsChanged =
      workingSetting !== undefined &&
      canonicalSetting !== undefined &&
      settingsDiffer(workingSetting, canonicalSetting) &&
      (category.useTimeWindows !== workingSetting.useTimeWindows ||
        category.isStrict !== workingSetting.isStrict);

    const slotsChanged =
      nextSlots.length !== category.timeSlots.length ||
      nextSlots.some((row, i) => row !== category.timeSlots[i]);

    if (!flagsChanged && !slotsChanged) return category;

    return {
      ...category,
      ...(flagsChanged
        ? {
            useTimeWindows: workingSetting.useTimeWindows,
            isStrict: workingSetting.isStrict,
            updatedAt: now,
          }
        : {}),
      timeSlots: nextSlots,
    };
  });
}
