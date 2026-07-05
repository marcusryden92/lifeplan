"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useCalendarProvider } from "@/context/CalendarProvider";
import type { Category, EventTemplate, Planner } from "@/types/prisma";
import { completeOnboarding } from "@/actions/onboarding";
import { getTaskTreeIds } from "@/utils/goalPageHandlers";
import {
  buildStarterCategories,
  STARTER_AREA_PRESETS,
  CUSTOM_AREA_COLORS,
  type AreaSelection,
} from "./_lib/starterCategories";
import { buildWeekTemplates, type WeekFormInput } from "./_lib/weekTemplates";
import { applyWorkCategory } from "./_lib/workCategory";
import {
  buildBrainDumpRow,
  durationForType,
  type DumpItem,
} from "./_lib/brainDumpRows";
import {
  PROGRESS_KEY,
  migrateProgress,
  type StoredProgress,
} from "./_lib/onboardingProgress";
import {
  makeEmptyRow,
  type LocationRow,
} from "./_components/LocationRows";
import { WelcomeStep } from "./_steps/WelcomeStep";
import { AreasStep } from "./_steps/AreasStep";
import { PlacesStep } from "./_steps/PlacesStep";
import { WeekStep, type WeekUIState } from "./_steps/WeekStep";
import { BrainDumpStep } from "./_steps/BrainDumpStep";
import { OnboardingAIStep } from "./_steps/OnboardingAIStep";

const TOTAL_STEPS = 6;

const DEFAULT_WEEK: WeekUIState = {
  sleepEnabled: true,
  sleepStart: "23:00",
  sleepEnd: "07:00",
  workEnabled: false,
  workStart: "09:00",
  workEnd: "17:00",
  workDays: [1, 2, 3, 4, 5],
  workLocationId: null,
};

function readProgress(): StoredProgress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    return migrateProgress(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const { categories, locations, userId, updateAll, updatePlannerArray } =
    useCalendarProvider();

  // Resume where the user left off; steps are non-destructive so a stale index
  // is harmless.
  const [stepIndex, setStepIndex] = useState<number>(() => {
    const progress = readProgress();
    if (progress && typeof progress.stepIndex === "number") {
      return Math.min(Math.max(progress.stepIndex, 0), TOTAL_STEPS - 1);
    }
    return 0;
  });

  // Prefill picked areas from existing top-level categories (returning user).
  const [areas, setAreas] = useState<AreaSelection[]>(() =>
    categories
      .filter((c) => !c.parentId)
      .map((c) => {
        const preset = STARTER_AREA_PRESETS.find(
          (p) => p.name.toLowerCase() === c.name.trim().toLowerCase(),
        );
        return preset
          ? { key: preset.key, name: preset.name, color: preset.color }
          : {
              key: `custom:${c.name.trim().toLowerCase()}`,
              name: c.name.trim(),
              color: c.color ?? CUSTOM_AREA_COLORS[0],
            };
      }),
  );

  const [locationRows, setLocationRows] = useState<LocationRow[]>(() => {
    if (locations.length > 0) {
      return [
        ...locations.map((l) => ({
          key: uuidv4(),
          name: l.name,
          query: l.address,
          selected: null,
          createdId: l.id,
        })),
        makeEmptyRow(),
      ];
    }
    return [makeEmptyRow("Home"), makeEmptyRow("Work")];
  });

  const [week, setWeek] = useState<WeekUIState>(() => ({
    ...DEFAULT_WEEK,
    workLocationId:
      locations.find((l) => l.name.trim().toLowerCase() === "work")?.id ?? null,
  }));

  // Brain-dump jots; the id on each becomes the Planner row id (idempotency
  // key), so re-committing on Back/forward upserts instead of duplicating.
  const [dumpItems, setDumpItems] = useState<DumpItem[]>(
    () => readProgress()?.dumpItems ?? [],
  );

  const [finishing, setFinishing] = useState(false);

  // Ids this flow committed, so re-committing (Back/forward, or a resumed
  // session) replaces them instead of stacking duplicates.
  const weekTemplateIds = useRef<Set<string>>(new Set());
  const dumpCommittedIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const progress = readProgress();
    if (progress) {
      weekTemplateIds.current = new Set(progress.weekTemplateIds);
      dumpCommittedIds.current = new Set(progress.dumpCommittedIds);
    }
  }, []);

  const persistProgress = useCallback(
    (step: number) => {
      try {
        localStorage.setItem(
          PROGRESS_KEY,
          JSON.stringify({
            version: 2,
            stepIndex: step,
            weekTemplateIds: [...weekTemplateIds.current],
            dumpItems,
            dumpCommittedIds: [...dumpCommittedIds.current],
          } satisfies StoredProgress),
        );
      } catch {
        // Progress persistence is best-effort.
      }
    },
    [dumpItems],
  );

  useEffect(() => {
    persistProgress(stepIndex);
  }, [stepIndex, persistProgress]);

  const goNext = useCallback(
    () => setStepIndex((i) => Math.min(i + 1, TOTAL_STEPS - 1)),
    [],
  );
  const goBack = useCallback(() => setStepIndex((i) => Math.max(i - 1, 0)), []);

  const commitAreas = useCallback(() => {
    if (areas.length === 0) return;
    const nowIso = new Date().toISOString();
    updateAll(undefined, undefined, undefined, (prev) => {
      const existing = new Set(prev.map((c) => c.name.trim().toLowerCase()));
      const fresh = areas.filter(
        (a) => !existing.has(a.name.trim().toLowerCase()),
      );
      if (fresh.length === 0) return prev;
      const built = buildStarterCategories(fresh, userId, nowIso, prev.length);
      return [...prev, ...built];
    });
  }, [areas, updateAll, userId]);

  const commitWeek = useCallback(() => {
    const form: WeekFormInput = {
      sleep: week.sleepEnabled
        ? { start: week.sleepStart, end: week.sleepEnd }
        : null,
      work: week.workEnabled
        ? {
            start: week.workStart,
            end: week.workEnd,
            days: week.workDays,
            locationId: week.workLocationId,
          }
        : null,
    };
    const nowIso = new Date().toISOString();
    const templateUpdater = (prev: EventTemplate[]) => {
      const kept = prev.filter((t) => !weekTemplateIds.current.has(t.id));
      const built = buildWeekTemplates(form, userId, nowIso);
      weekTemplateIds.current = new Set(built.map((t) => t.id));
      return [...kept, ...built];
    };
    // Sleep rides as a template; work hours become windows on a Work category
    // (nested under Career). Both go in one updateAll so they share a regen.
    const categoriesUpdater = form.work
      ? (prev: Category[]) => applyWorkCategory(prev, form.work, userId, nowIso)
      : undefined;
    updateAll(undefined, undefined, templateUpdater, categoriesUpdater);
  }, [week, updateAll, userId]);

  const commitBrainDump = useCallback(() => {
    const nowIso = new Date().toISOString();
    const currentIds = dumpItems.map((it) => it.id);
    const currentIdSet = new Set(currentIds);
    updatePlannerArray((prev) => {
      // Removals: committed ids no longer in the list drop with their subtrees
      // (the AI step may have attached children on a Back/forward loop).
      const removedIds = [...dumpCommittedIds.current].filter(
        (id) => !currentIdSet.has(id),
      );
      let next = prev;
      if (removedIds.length > 0) {
        const toRemove = new Set(
          removedIds.flatMap((id) => getTaskTreeIds(prev, id)),
        );
        next = next.filter((p) => !toRemove.has(p.id));
      }

      // Upsert by id: patch title/type on existing rows (re-defaulting duration
      // only when the type changed, so AI-set durations survive), append new.
      const byId = new Map(next.map((p) => [p.id, p] as const));
      const appended: Planner[] = [];
      for (const item of dumpItems) {
        const existing = byId.get(item.id);
        if (existing) {
          const typeChanged = existing.plannerType !== item.type;
          byId.set(item.id, {
            ...existing,
            title: item.title.trim(),
            plannerType: item.type,
            duration: typeChanged
              ? durationForType(item.type)
              : existing.duration,
            updatedAt: nowIso,
          });
        } else {
          appended.push(buildBrainDumpRow(item, userId, nowIso));
        }
      }

      dumpCommittedIds.current = new Set(currentIds);
      return [...next.map((p) => byId.get(p.id) ?? p), ...appended];
    });
  }, [dumpItems, updatePlannerArray, userId]);

  const finish = useCallback(async () => {
    setFinishing(true);
    try {
      await completeOnboarding();
    } catch {
      // Don't trap the user if the stamp fails; the dashboard checklist still
      // covers resuming the individual surfaces.
    }
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch {
      // best-effort
    }
    onComplete();
  }, [onComplete]);

  switch (stepIndex) {
    case 0:
      return (
        <WelcomeStep
          stepIndex={0}
          totalSteps={TOTAL_STEPS}
          onGetStarted={goNext}
          onSkipSetup={finish}
          finishing={finishing}
        />
      );
    case 1:
      return (
        <AreasStep
          stepIndex={1}
          totalSteps={TOTAL_STEPS}
          selections={areas}
          onChange={setAreas}
          onBack={goBack}
          onContinue={() => {
            commitAreas();
            goNext();
          }}
          onSkip={goNext}
        />
      );
    case 2:
      return (
        <PlacesStep
          stepIndex={2}
          totalSteps={TOTAL_STEPS}
          rows={locationRows}
          onRowsChange={setLocationRows}
          onBack={goBack}
          onContinue={goNext}
          onSkip={goNext}
        />
      );
    case 3:
      return (
        <WeekStep
          stepIndex={3}
          totalSteps={TOTAL_STEPS}
          value={week}
          onChange={setWeek}
          onBack={goBack}
          onContinue={() => {
            commitWeek();
            goNext();
          }}
          onSkip={goNext}
        />
      );
    case 4:
      return (
        <BrainDumpStep
          stepIndex={4}
          totalSteps={TOTAL_STEPS}
          items={dumpItems}
          onChange={setDumpItems}
          onBack={goBack}
          onContinue={() => {
            commitBrainDump();
            goNext();
          }}
          onSkip={goNext}
        />
      );
    default:
      return (
        <OnboardingAIStep
          stepIndex={5}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onFinish={finish}
          onSkip={finish}
          finishing={finishing}
        />
      );
  }
}
