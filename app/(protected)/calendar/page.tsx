"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import {
  CalendarCog,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { Button, ConicDot, vars } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { getWeekFirstDate, shiftDate } from "@/utils/calendarUtils";
import Calendar from "./_components/Calendar";
import { CalendarHoverLabelContext } from "@/components/events/CalendarHoverLabelContext";
import { worstUnresolved } from "@/utils/engineTones";
import {
  ENGINE_MSGS,
  ENGINE_SUMMARY,
  type EngineTone,
} from "../_mock/calendar";
import { WeekPlanModal } from "@/components/calendar/WeekPlanModal";
import { EngineControls } from "./_components/EngineControls";
import "./_styles/fullcalendar.css";
import {
  page,
  subHeader,
  rangeTitle,
  navCluster,
  spacer,
  actionCluster,
  headerConsoleSpacer,
  headerEngineLabel,
  engineCogBtn,
  engineCogAlertDot,
  calendarRegion,
  mainGrid,
  calendarCard,
  engineCol,
  engineContainer,
  engineHeader,
  engineTitle,
  engineLastRun,
  engineSummary,
  engineList,
  engineCard,
  engineCardHead,
  engineTag,
  engineCardTitle,
  engineCardBody,
  fcWrap,
  dayHeaderStack,
  dayHeaderLabel,
  dayHeaderLabelToday,
  dayHeaderNum,
  dayHeaderNumToday,
} from "./page.css";

const CONSOLE_COLLAPSE_KEY = "circadium.engine.collapsed";

function toneColor(tone: EngineTone) {
  switch (tone) {
    case "fail":
      return vars.status.error;
    case "warn":
      return vars.status.warning;
    case "done":
      return vars.status.success;
    case "info":
    default:
      return vars.status.info;
  }
}

export default function CalendarPage() {
  const { weekStartDay, manuallyRefreshCalendar } = useCalendarProvider();
  const [initialDate, setInitialDate] = useState<Date>(() =>
    getWeekFirstDate(weekStartDay, new Date()),
  );
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // Suppresses the engineCol transition during the first frame so syncing
  // collapsed state from localStorage doesn't animate width 340 → 0 on mount.
  const [transitionsReady, setTransitionsReady] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<{
    name: string;
    color: string | null;
  } | null>(null);
  const handleCategoryHover = useCallback(
    (name: string | null, color: string | null) => {
      setHoveredCategory(name ? { name, color } : null);
    },
    [],
  );
  // Same setter for event tiles via context — keeps the header chip a single
  // surface that anything hoverable on the calendar can populate.
  const setHoverLabel = useCallback(
    (label: { name: string; color: string | null } | null) =>
      setHoveredCategory(label),
    [],
  );

  useLayoutEffect(() => {
    try {
      const stored = window.localStorage.getItem(CONSOLE_COLLAPSE_KEY);
      if (stored === "1") setConsoleCollapsed(true);
    } catch {}
    setHydrated(true);
    const id = requestAnimationFrame(() => setTransitionsReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useLayoutEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        CONSOLE_COLLAPSE_KEY,
        consoleCollapsed ? "1" : "0",
      );
    } catch {}
  }, [consoleCollapsed, hydrated]);

  const toggleConsole = () => setConsoleCollapsed((c) => !c);

  const alertTone = worstUnresolved(ENGINE_MSGS);

  const finalDate = shiftDate(initialDate, 6);
  const range = `${format(initialDate, "MMM d")} – ${format(finalDate, "MMM d")}`;

  const goPrev = () => setInitialDate((d) => shiftDate(d, -7));
  const goNext = () => setInitialDate((d) => shiftDate(d, 7));
  const goToday = () =>
    setInitialDate(getWeekFirstDate(weekStartDay, new Date()));

  return (
    <div
      className={page}
      data-console-collapsed={consoleCollapsed}
      data-no-transitions={transitionsReady ? undefined : "true"}
    >
      <div className={calendarRegion}>
        <div className={subHeader}>
          <h1 className={rangeTitle}>{range}</h1>
          <div className={navCluster}>
            <Button
              variant="glass"
              size="sm"
              onClick={goPrev}
              aria-label="Previous week"
            >
              <ChevronLeft size={14} strokeWidth={2} />
            </Button>
            <Button variant="glass" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={goNext}
              aria-label="Next week"
            >
              <ChevronRight size={14} strokeWidth={2} />
            </Button>
          </div>
          {hoveredCategory && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: vars.inkSoft,
                fontFamily: vars.font.ui,
                fontWeight: 600,
                letterSpacing: "0.01em",
                whiteSpace: "nowrap",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: hoveredCategory.color ?? vars.muted,
                  flexShrink: 0,
                }}
              />
              {hoveredCategory.name}
            </span>
          )}
          <span className={spacer} />
          <div className={actionCluster}>
            <Button variant="glass" size="sm">
              Filters · all
            </Button>
            <Button variant="glass" size="sm">
              Week ▾
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={() => setPlanOpen(true)}
              aria-label="Edit week templates and category windows"
            >
              <CalendarCog size={13} strokeWidth={2.2} />
              Plan week
            </Button>
            <Button variant="solid" size="sm" onClick={manuallyRefreshCalendar}>
              <RotateCw size={13} strokeWidth={2.4} />
              Regenerate
            </Button>
          </div>
          <div className={headerConsoleSpacer} aria-hidden={consoleCollapsed}>
            <span className={headerEngineLabel}>
              <ConicDot size={10} />
              <span className={engineTitle}>Engine</span>
            </span>
          </div>
          <button
            type="button"
            className={engineCogBtn}
            onClick={toggleConsole}
            aria-pressed={!consoleCollapsed}
            aria-label={
              consoleCollapsed
                ? "Open engine console"
                : "Collapse engine console"
            }
            title={
              consoleCollapsed
                ? "Open engine console"
                : "Collapse engine console"
            }
          >
            <Settings size={16} strokeWidth={1.8} />
            {alertTone && (
              <span
                className={engineCogAlertDot}
                style={{ background: toneColor(alertTone) }}
              />
            )}
          </button>
        </div>

        <div className={mainGrid}>
          <div className={calendarCard}>
            <div className={`${fcWrap} circadium-calendar`}>
              <CalendarHoverLabelContext.Provider value={setHoverLabel}>
                <Calendar
                  initialDate={initialDate}
                  onCategoryHover={handleCategoryHover}
                  dayHeaderContent={(arg) => (
                    <div className={dayHeaderStack}>
                      <span
                        className={`${dayHeaderLabel} ${
                          arg.isToday ? dayHeaderLabelToday : ""
                        }`}
                      >
                        {format(arg.date, "EEE")}
                      </span>
                      <span
                        className={`${dayHeaderNum} ${
                          arg.isToday ? dayHeaderNumToday : ""
                        }`}
                      >
                        {arg.date.getDate()}
                      </span>
                    </div>
                  )}
                />
              </CalendarHoverLabelContext.Provider>
            </div>
          </div>

          <div className={engineCol}>
            <div className={engineContainer}>
              <div className={engineHeader}>
                <span className={engineLastRun}>
                  last run · {ENGINE_SUMMARY.lastRun}
                </span>
                <div className={engineSummary}>
                  {ENGINE_SUMMARY.failCount} fail · {ENGINE_SUMMARY.warnCount}{" "}
                  warn · {ENGINE_SUMMARY.placedCount} placed across the week
                </div>
              </div>

              <div className={engineList}>
                {ENGINE_MSGS.map((m, i) => {
                  const tc = toneColor(m.tone);
                  return (
                    <div
                      key={i}
                      className={engineCard}
                      style={{
                        borderColor: `color-mix(in srgb, ${tc} 60%, transparent)`,
                      }}
                    >
                      <div className={engineCardHead}>
                        <span className={engineTag} style={{ background: tc }}>
                          {m.tag}
                        </span>
                        <span className={engineCardTitle}>{m.title}</span>
                      </div>
                      <div className={engineCardBody}>{m.body}</div>
                    </div>
                  );
                })}
              </div>

              <EngineControls />
            </div>
          </div>
        </div>

        <WeekPlanModal open={planOpen} onClose={() => setPlanOpen(false)} />
      </div>
    </div>
  );
}

