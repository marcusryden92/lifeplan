import { v4 as uuidv4 } from "uuid";
import type { Category, CategoryTimeWindow } from "@/types/prisma";
import type { WorkInput } from "./weekTemplates";

// Work hours are modelled as time windows on a "Work" category nested under the
// "Career" life area — not as blocking templates. That way the engine schedules
// Career/Work tasks into those hours instead of treating work as a fixed event.
const CAREER_NAME = "Career";
const WORK_NAME = "Work";
const CAREER_COLOR = "#3b82f6";
const END_OF_DAY = "23:59";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// One window per picked day, split at midnight for the rare overnight shift so
// every row stays within a single day (WeekStructureModal can't render an
// overnight window; the "23:59" end mirrors the assistant's sentinel).
function buildWorkWindows(
  work: WorkInput,
  categoryId: string,
  userId: string,
): CategoryTimeWindow[] {
  const startMin = toMinutes(work.start);
  const endMin = toMinutes(work.end);
  const windows: CategoryTimeWindow[] = [];
  for (const day of work.days) {
    if (endMin > startMin) {
      windows.push({
        id: uuidv4(),
        day,
        startTime: work.start,
        endTime: work.end,
        categoryId,
        userId,
      });
      continue;
    }
    windows.push({
      id: uuidv4(),
      day,
      startTime: work.start,
      endTime: END_OF_DAY,
      categoryId,
      userId,
    });
    if (endMin > 0) {
      windows.push({
        id: uuidv4(),
        day,
        startTime: "00:00",
        endTime: work.end,
        categoryId,
        userId,
      });
    }
  }
  return windows;
}

// Ensures a Career area and a Work sub-category exist, rebuilding the Work
// category's windows from the form. Find-by-name/parent keeps it idempotent
// across Back/forward re-commits — the windows are replaced wholesale, never
// stacked. Returns prev unchanged when there are no work hours to apply.
export function applyWorkCategory(
  prev: Category[],
  work: WorkInput | null,
  userId: string,
  nowIso: string,
): Category[] {
  if (!work || work.days.length === 0) return prev;

  const next = [...prev];

  let careerIdx = next.findIndex(
    (c) => !c.parentId && c.name.trim().toLowerCase() === CAREER_NAME.toLowerCase(),
  );
  if (careerIdx === -1) {
    next.push({
      id: uuidv4(),
      name: CAREER_NAME,
      icon: null,
      color: CAREER_COLOR,
      sortOrder: next.length,
      useTimeWindows: false,
      isStrict: false,
      confineToOwnWindows: false,
      locationId: null,
      parentId: null,
      userId,
      timeSlots: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    careerIdx = next.length - 1;
  }
  const careerId = next[careerIdx].id;

  const workIdx = next.findIndex(
    (c) =>
      c.parentId === careerId &&
      c.name.trim().toLowerCase() === WORK_NAME.toLowerCase(),
  );
  if (workIdx === -1) {
    const workId = uuidv4();
    next.push({
      id: workId,
      name: WORK_NAME,
      icon: null,
      color: null,
      sortOrder: next.filter((c) => c.parentId === careerId).length,
      useTimeWindows: true,
      isStrict: false,
      confineToOwnWindows: false,
      locationId: work.locationId ?? null,
      parentId: careerId,
      userId,
      timeSlots: buildWorkWindows(work, workId, userId),
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  } else {
    const workId = next[workIdx].id;
    next[workIdx] = {
      ...next[workIdx],
      useTimeWindows: true,
      locationId: work.locationId ?? null,
      timeSlots: buildWorkWindows(work, workId, userId),
      updatedAt: nowIso,
    };
  }

  return next;
}
