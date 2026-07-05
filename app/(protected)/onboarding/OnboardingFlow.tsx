"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useCalendarProvider } from "@/context/CalendarProvider";
import type { Category, EventTemplate } from "@/types/prisma";
import { completeOnboarding } from "@/actions/onboarding";
import {
  reconcileRoleCategories,
  STARTER_ROLE_PRESETS,
  CUSTOM_ROLE_COLORS,
  type RoleSelection,
} from "./_lib/starterCategories";
import { buildWeekTemplates, type WeekFormInput } from "./_lib/weekTemplates";
import { applyWorkCategory } from "./_lib/workCategory";
import {
  applyBrainDump,
  type CommittedDump,
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
import { RolesStep } from "./_steps/RolesStep";
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

  // Prefill picked roles from existing top-level categories (returning user).
  const [roles, setRoles] = useState<RoleSelection[]>(() =>
    categories
      .filter((c) => !c.parentId)
      .map((c) => {
        const preset = STARTER_ROLE_PRESETS.find(
          (p) => p.name.toLowerCase() === c.name.trim().toLowerCase(),
        );
        return preset
          ? { key: preset.key, name: preset.name, color: preset.color }
          : {
              key: `custom:${c.name.trim().toLowerCase()}`,
              name: c.name.trim(),
              color: c.color ?? CUSTOM_ROLE_COLORS[0],
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

  // What this flow committed, so re-committing (Back/forward, or a resumed
  // session) reconciles instead of stacking duplicates. Roles and week track
  // owned ids for removal/replace; the dump tracks a per-id snapshot so a
  // re-commit only overwrites fields the user actually re-edited.
  const roleCommittedIds = useRef<Set<string>>(new Set());
  const weekTemplateIds = useRef<Set<string>>(new Set());
  const dumpCommitted = useRef<Map<string, CommittedDump>>(new Map());
  useEffect(() => {
    const progress = readProgress();
    if (progress) {
      roleCommittedIds.current = new Set(progress.roleCommittedIds);
      weekTemplateIds.current = new Set(progress.weekTemplateIds);
      dumpCommitted.current = new Map(
        progress.dumpCommitted.map((d) => [
          d.id,
          { title: d.title, type: d.type },
        ]),
      );
    }
  }, []);

  const persistProgress = useCallback(
    (step: number) => {
      try {
        localStorage.setItem(
          PROGRESS_KEY,
          JSON.stringify({
            version: 3,
            stepIndex: step,
            roleCommittedIds: [...roleCommittedIds.current],
            weekTemplateIds: [...weekTemplateIds.current],
            dumpItems,
            dumpCommitted: [...dumpCommitted.current].map(([id, s]) => ({
              id,
              title: s.title,
              type: s.type,
            })),
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

  const commitRoles = useCallback(() => {
    if (!userId) return;
    const nowIso = new Date().toISOString();
    // A stable candidate id per selection keeps the reconcile pure so a
    // double-invoked updater can't mint two different ids for the same role.
    const candidateIds = new Map(
      roles.map((r) => [r.name.trim().toLowerCase(), uuidv4()] as const),
    );
    updateAll(undefined, undefined, undefined, (prev) => {
      const { categories, ownedIds } = reconcileRoleCategories(
        prev,
        roles,
        roleCommittedIds.current,
        candidateIds,
        userId,
        nowIso,
      );
      roleCommittedIds.current = ownedIds;
      return categories;
    });
  }, [roles, updateAll, userId]);

  const commitWeek = useCallback(() => {
    if (!userId) return;
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
    // Mint the templates and advance the owned-id set once, outside the
    // updater, so the updater stays a pure function of its previous value.
    const built = buildWeekTemplates(form, userId, nowIso);
    const prevOwned = weekTemplateIds.current;
    weekTemplateIds.current = new Set(built.map((t) => t.id));
    const templateUpdater = (prev: EventTemplate[]) => [
      ...prev.filter((t) => !prevOwned.has(t.id)),
      ...built,
    ];
    // Sleep rides as a template; work hours become windows on a Work category
    // (nested under Career). Both go in one updateAll so they share a regen.
    const categoriesUpdater = form.work
      ? (prev: Category[]) => applyWorkCategory(prev, form.work, userId, nowIso)
      : undefined;
    updateAll(undefined, undefined, templateUpdater, categoriesUpdater);
  }, [week, updateAll, userId]);

  const commitBrainDump = useCallback(() => {
    if (!userId) return;
    const nowIso = new Date().toISOString();
    const items = dumpItems;
    const prevCommitted = dumpCommitted.current;
    updatePlannerArray((prev) =>
      applyBrainDump(prev, items, prevCommitted, userId, nowIso),
    );
    dumpCommitted.current = new Map(
      items.map((it) => [it.id, { title: it.title.trim(), type: it.type }]),
    );
  }, [dumpItems, updatePlannerArray, userId]);

  const finish = useCallback(async () => {
    setFinishing(true);
    let stamped = false;
    try {
      await completeOnboarding();
      stamped = true;
    } catch {
      // Don't trap the user if the stamp fails; the dashboard checklist still
      // covers resuming the individual surfaces.
    }
    // Only clear progress once the stamp landed — otherwise the server gate
    // re-shows onboarding on the next load, and we want it to resume where the
    // user was (with their jots) rather than restart from scratch.
    if (stamped) {
      try {
        localStorage.removeItem(PROGRESS_KEY);
      } catch {
        // best-effort
      }
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
        <RolesStep
          stepIndex={1}
          totalSteps={TOTAL_STEPS}
          selections={roles}
          onChange={setRoles}
          onBack={goBack}
          onContinue={() => {
            commitRoles();
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
