"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { useCapture } from "@/components/ui";
import { usePlatform } from "@/hooks/usePlatform";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCalendarProvider } from "@/context/CalendarProvider";
import type { RootState } from "@/redux/store";
import {
  formatLongDate,
  greetingForHour,
} from "@/utils/timeFormatting";
import { DashboardHeader } from "./_components/DashboardHeader";
import { AgendaCard } from "./_components/AgendaCard";
import { PriorityGoalsCard } from "./_components/PriorityGoalsCard";
import { buildTodayAgenda } from "./_data/buildTodayAgenda";
import { buildUncompletedItems } from "./_data/buildUncompletedItems";
import { buildPriorityGoals } from "./_data/buildPriorityGoals";
import { groupAgenda } from "./_data/groupAgenda";
import {
  pruneAgendaForRollover,
  summarizeAgenda,
} from "./_data/agendaSummary";
import { page, gridWrap, rightCol } from "./page.css";

export default function DashboardPage() {
  const router = useRouter();
  const { setOpen: setCaptureOpen } = useCapture();
  const { modKey } = usePlatform();
  const sessionUser = useCurrentUser();

  const {
    planner,
    calendar,
    template,
    categories,
    travelEvents,
    inheritedLocationMap,
    updateAll,
  } = useCalendarProvider();

  const isLoaded = useSelector((state: RootState) => state.calendar.isLoaded);
  const plannerScores = useSelector(
    (state: RootState) => state.calendar.plannerScores,
  );
  const locations = useSelector(
    (state: RootState) => state.schedulingSettings.locations,
  );

  const now = useMemo(() => new Date(), []);

  const rawAgenda = useMemo(
    () =>
      buildTodayAgenda({
        now,
        calendar,
        travelEvents,
        templates: template,
        planners: planner,
        categories,
        locations,
        inheritedLocationMap,
      }),
    [
      now,
      calendar,
      travelEvents,
      template,
      planner,
      categories,
      locations,
      inheritedLocationMap,
    ],
  );

  const uncompleted = useMemo(
    () =>
      buildUncompletedItems({ now, planners: planner, categories, calendar }),
    [now, planner, categories, calendar],
  );

  const agenda = useMemo(
    () => pruneAgendaForRollover(rawAgenda, now, uncompleted),
    [rawAgenda, now, uncompleted],
  );

  const summary = useMemo(() => summarizeAgenda(agenda), [agenda]);

  const goals = useMemo(
    () =>
      buildPriorityGoals({
        now,
        planners: planner,
        categories,
        calendar,
        plannerScores,
      }),
    [now, planner, categories, calendar, plannerScores],
  );

  const agendaRowsBuilt = useMemo(() => groupAgenda(agenda), [agenda]);

  const greetingText = greetingForHour(now.getHours(), sessionUser?.name);
  const dateText = formatLongDate(now);

  const openItem = (plannerId: string) => router.push(`/items/${plannerId}`);

  // Mirror handleClickCompleteTask semantics: set completedStartTime /
  // completedEndTime on the planner and remove any scheduled instance from
  // the calendar so the next regen leaves the slot free.
  const completeUncompleted = (plannerId: string) => {
    const stamp = new Date().toISOString();
    updateAll(
      (prev) =>
        prev.map((p) =>
          p.id === plannerId
            ? { ...p, completedStartTime: stamp, completedEndTime: stamp }
            : p,
        ),
      (prev) => prev.filter((e) => e.id !== plannerId),
    );
  };

  // Mirror handlePostponeTask: strip any scheduled instance and let the
  // next regen reschedule. The planner row stays untouched.
  const postponeUncompleted = (plannerId: string) => {
    updateAll(
      (prev) => prev,
      (prev) => prev.filter((e) => e.id !== plannerId),
    );
  };

  return (
    <div className={page}>
      <DashboardHeader
        greetingText={greetingText}
        dateText={dateText}
        summary={summary}
        modKey={modKey}
        onCaptureClick={() => setCaptureOpen(true)}
      />

      <div className={gridWrap}>
        <AgendaCard
          isLoaded={isLoaded}
          hasAnyAgenda={agenda.length > 0 || uncompleted.length > 0}
          uncompleted={uncompleted}
          agendaRowsBuilt={agendaRowsBuilt}
          summary={summary}
          onOpenItem={openItem}
          onCompleteUncompleted={completeUncompleted}
          onPostponeUncompleted={postponeUncompleted}
        />

        <div className={rightCol}>
          <PriorityGoalsCard
            isLoaded={isLoaded}
            goals={goals}
            onOpenGoal={openItem}
          />
        </div>
      </div>
    </div>
  );
}
