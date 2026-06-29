"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useSelector } from "react-redux";
import {
  Glass,
  Caption,
  Button,
  CategoryBadge,
  CategoryDot,
  Kbd,
  Loader,
  categoryColor as resolveCategoryColor,
  useCapture,
} from "@/components/ui";
import { usePlatform } from "@/hooks/usePlatform";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCalendarProvider } from "@/context/CalendarProvider";
import type { RootState } from "@/redux/store";
import {
  buildPriorityGoals,
  buildTodayAgenda,
  formatAgendaTime,
  formatDashboardDate,
  formatPlannedMinutes,
  greetingForHour,
  summarizeAgenda,
} from "./dashboardData";
import {
  page,
  headerRow,
  greeting,
  summaryLine,
  summaryStrong,
  summaryError,
  headerActions,
  gridWrap,
  leftCard,
  leftCardHeader,
  leftCardTitle,
  agendaList,
  agendaRows,
  agendaRow,
  agendaRowNow,
  agendaRowTravel,
  agendaTimeCol,
  agendaTime,
  agendaTimeNow,
  agendaDur,
  agendaTitle,
  agendaTitleTravel,
  agendaMeta,
  agendaMetaDimmer,
  agendaWarn,
  agendaOverdue,
  agendaChevron,
  agendaEmpty,
  rightCol,
  goalsCard,
  goalsHeader,
  goalsTitle,
  goalRow,
  goalHead,
  goalName,
  goalFraction,
  goalTrack,
  goalFill,
  goalFooter,
  goalNext,
  goalsEmpty,
} from "./page.css";

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
  } = useCalendarProvider();

  const isLoaded = useSelector((state: RootState) => state.calendar.isLoaded);
  const plannerScores = useSelector(
    (state: RootState) => state.calendar.plannerScores,
  );
  const locations = useSelector(
    (state: RootState) => state.schedulingSettings.locations,
  );

  const now = useMemo(() => new Date(), []);

  const agenda = useMemo(
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

  const greetingText = greetingForHour(now.getHours(), sessionUser?.name);
  const dateText = formatDashboardDate(now);

  return (
    <div className={page}>
      <div className={headerRow}>
        <div>
          <h1 className={greeting}>{greetingText}</h1>
          <div className={summaryLine}>
            <span className={summaryStrong}>{dateText}</span>
            {" · "}
            <span className={summaryStrong}>{summary.itemCount}</span>
            {summary.itemCount === 1 ? " thing on today" : " things on today"}
            {" · "}
            <span className={summaryStrong}>
              {formatPlannedMinutes(summary.plannedMinutes)}
            </span>
            {" planned"}
            {summary.overdueCount > 0 && (
              <>
                {" · "}
                <span className={summaryError}>
                  {summary.overdueCount} overdue
                </span>
              </>
            )}
            {summary.pastDeadlineCount > 0 && (
              <>
                {" · "}
                {summary.pastDeadlineCount} scheduled past deadline
              </>
            )}
          </div>
        </div>
        <div className={headerActions}>
          <Button variant="glass" onClick={() => setCaptureOpen(true)}>
            <Kbd>{modKey}</Kbd>
            <Kbd>K</Kbd>
            capture
          </Button>
          <Link href="/calendar">
            <Button variant="solid">Open calendar →</Button>
          </Link>
        </div>
      </div>

      <div className={gridWrap}>
        <div className={leftCard}>
          <div className={leftCardHeader}>
            <div>
              <h2 className={leftCardTitle}>What to do today</h2>
              <Caption style={{ marginTop: 4, display: "inline-block" }}>
                scheduler order · {summary.itemCount}{" "}
                {summary.itemCount === 1 ? "item" : "items"} ·{" "}
                {formatPlannedMinutes(summary.plannedMinutes)}
              </Caption>
            </div>
            <Link href="/calendar">
              <Button variant="glass" size="sm">
                Full week →
              </Button>
            </Link>
          </div>
          <div className={agendaList}>
            <div className={agendaRows}>
              {!isLoaded ? (
                <div className={agendaEmpty}>
                  <Loader size="md" label="Loading today's agenda" />
                </div>
              ) : agenda.length === 0 ? (
                <div className={agendaEmpty}>
                  <Caption>Nothing scheduled for today.</Caption>
                </div>
              ) : (
                agenda.map((item) => {
                  const interactive = !item.travel && !!item.plannerId;
                  const rowClass = [
                    agendaRow,
                    item.now ? agendaRowNow : "",
                    item.travel ? agendaRowTravel : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const handleClick = interactive
                    ? () => router.push(`/items/${item.plannerId}`)
                    : undefined;
                  const color = resolveCategoryColor({
                    color: item.categoryColor ?? null,
                  });
                  return (
                    <div
                      key={item.id}
                      className={rowClass}
                      onClick={handleClick}
                      role={interactive ? "button" : undefined}
                      tabIndex={interactive ? 0 : undefined}
                      onKeyDown={
                        interactive
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleClick?.();
                              }
                            }
                          : undefined
                      }
                    >
                      <div className={agendaTimeCol}>
                        <div
                          className={`${agendaTime} ${
                            item.now ? agendaTimeNow : ""
                          }`}
                        >
                          {item.now ? "NOW" : formatAgendaTime(item.start)}
                        </div>
                        <div className={agendaDur}>
                          {formatPlannedMinutes(item.durationMinutes)}
                        </div>
                      </div>

                      <div>
                        <div
                          className={`${agendaTitle} ${
                            item.travel ? agendaTitleTravel : ""
                          }`}
                        >
                          {item.title}
                        </div>
                        {!item.travel && (
                          <div className={agendaMeta}>
                            {item.categoryName && (
                              <CategoryBadge color={color}>
                                {item.categoryName}
                              </CategoryBadge>
                            )}
                            {item.where && <Caption>{item.where}</Caption>}
                            {item.kind === "plan" && (
                              <Caption className={agendaMetaDimmer}>
                                · fixed
                              </Caption>
                            )}
                            {item.kind === "template" && (
                              <Caption className={agendaMetaDimmer}>
                                · recurring
                              </Caption>
                            )}
                            {item.warn && (
                              <span className={agendaWarn}>LATE</span>
                            )}
                            {item.overdue && (
                              <span className={agendaOverdue}>OVERDUE</span>
                            )}
                            {item.pastDeadline && !item.overdue && (
                              <span className={agendaOverdue}>
                                PAST DEADLINE
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {interactive ? (
                        <span className={agendaChevron} aria-hidden>
                          <ChevronRight size={16} strokeWidth={2} />
                        </span>
                      ) : (
                        <span />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className={rightCol}>
          <Glass radius="lg" className={goalsCard}>
            <div className={goalsHeader}>
              <div>
                <h2 className={goalsTitle}>Priority goals</h2>
                <Caption style={{ marginTop: 3, display: "inline-block" }}>
                  scored by the calendar engine
                </Caption>
              </div>
              <Caption>{goals.length} shown</Caption>
            </div>
            {!isLoaded ? (
              <div className={goalsEmpty}>
                <Loader size="sm" label="Loading goals" />
              </div>
            ) : goals.length === 0 ? (
              <div className={goalsEmpty}>
                <Caption>No active goals yet.</Caption>
              </div>
            ) : (
              goals.map((g) => {
                const color = resolveCategoryColor({
                  color: g.categoryColor ?? null,
                });
                return (
                  <div
                    key={g.id}
                    className={goalRow}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/items/${g.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/items/${g.id}`);
                      }
                    }}
                  >
                    <div className={goalHead}>
                      <CategoryDot color={color} size={9} />
                      <span className={goalName}>{g.name}</span>
                      <span className={goalFraction}>{g.fraction}</span>
                    </div>
                    <div className={goalTrack}>
                      <div
                        className={goalFill}
                        style={{
                          width: `${g.pct}%`,
                          background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 80%, transparent))`,
                        }}
                      />
                    </div>
                    <div className={goalFooter}>
                      <span className={goalNext}>
                        {g.next ? `→ ${g.next}` : "→ not yet scheduled"}
                      </span>
                      {g.deadline && (
                        <Caption style={{ fontSize: 9.5 }}>
                          by {g.deadline}
                        </Caption>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </Glass>
        </div>
      </div>
    </div>
  );
}
