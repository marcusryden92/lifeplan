"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarCog,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import {
  Glass,
  Caption,
  Button,
  ConicDot,
  vars,
} from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { getWeekFirstDate, shiftDate } from "@/utils/calendarUtils";
import Calendar from "@/app/(protected)/calendar/components/Calendar";
import {
  ENGINE_MSGS,
  ENGINE_SUMMARY,
  type EngineTone,
} from "../_mock/calendar";
import { WeekPlanModal } from "./_components/WeekPlanModal";
import "./fullcalendar.css";
import {
  page,
  subHeader,
  rangeTitle,
  navCluster,
  spacer,
  actionCluster,
  calendarRegion,
  mainGrid,
  calendarCard,
  engineCol,
  engineContainer,
  engineHeader,
  engineHeaderRow,
  engineTitle,
  engineSpacer,
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

const TONE_SEVERITY: Record<EngineTone, number> = {
  fail: 3,
  warn: 2,
  info: 1,
  done: 0,
};

function worstUnresolved(): EngineTone | null {
  let worst: EngineTone | null = null;
  for (const m of ENGINE_MSGS) {
    if (m.tone === "fail" || m.tone === "warn") {
      if (!worst || TONE_SEVERITY[m.tone] > TONE_SEVERITY[worst]) {
        worst = m.tone;
      }
    }
  }
  return worst;
}

export default function CalendarPage() {
  const { weekStartDay, manuallyRefreshCalendar } = useCalendarProvider();
  const [initialDate, setInitialDate] = useState<Date>(() =>
    getWeekFirstDate(weekStartDay, new Date()),
  );
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CONSOLE_COLLAPSE_KEY);
      if (stored === "1") setConsoleCollapsed(true);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        CONSOLE_COLLAPSE_KEY,
        consoleCollapsed ? "1" : "0",
      );
    } catch {}
  }, [consoleCollapsed, hydrated]);

  const toggleConsole = () => setConsoleCollapsed((c) => !c);

  const alertTone = worstUnresolved();

  const finalDate = shiftDate(initialDate, 6);
  const range = `${format(initialDate, "MMM d")} – ${format(finalDate, "MMM d")}`;

  const goPrev = () => setInitialDate((d) => shiftDate(d, -7));
  const goNext = () => setInitialDate((d) => shiftDate(d, 7));
  const goToday = () =>
    setInitialDate(getWeekFirstDate(weekStartDay, new Date()));

  return (
    <div className={page} data-console-collapsed={consoleCollapsed}>
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
            <Button
              variant="glass"
              size="sm"
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
              {alertTone ? (
                <AlertCircle
                  size={14}
                  strokeWidth={2.4}
                  style={{ color: toneColor(alertTone) }}
                />
              ) : (
                <Settings size={13} strokeWidth={2} />
              )}
              Engine
            </Button>
          </div>
        </div>

        <div className={mainGrid}>
          <div className={calendarCard}>
            <div className={`${fcWrap} lumen-calendar`}>
              <Calendar
                initialDate={initialDate}
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
            </div>
          </div>

          <div className={engineCol}>
            <Glass radius="lg" className={engineContainer}>
              <div className={engineHeader}>
                <div className={engineHeaderRow}>
                  <ConicDot size={10} />
                  <span className={engineTitle}>Engine</span>
                  <Caption className={engineSpacer}>
                    last run · {ENGINE_SUMMARY.lastRun}
                  </Caption>
                </div>
                <div className={engineSummary}>
                  {ENGINE_SUMMARY.failCount} fail · {ENGINE_SUMMARY.warnCount}{" "}
                  warn · {ENGINE_SUMMARY.placedCount} placed across the week
                </div>
              </div>

              <div className={engineList}>
                {ENGINE_MSGS.map((m, i) => {
                  const tc = toneColor(m.tone);
                  const showFix = m.tone === "fail" || m.tone === "warn";
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
                      {showFix && (
                        <div style={{ marginTop: 8 }}>
                          <Button variant="glass" size="sm">
                            See fixes →
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Glass>
          </div>
        </div>

        <WeekPlanModal open={planOpen} onClose={() => setPlanOpen(false)} />
      </div>
    </div>
  );
}
