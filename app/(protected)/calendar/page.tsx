"use client";

import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCog,
  ChevronLeft,
  ChevronRight,
  Locate,
  RotateCw,
  Settings,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/redux/store";
import { dismissEngineMessage } from "@/redux/slices/engineOutputSlice";
import { Button, ConicDot, vars } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { getWeekFirstDate, shiftDate } from "@/utils/calendarUtils";
import Calendar from "./_components/Calendar";
import { CalendarHoverLabelContext } from "@/components/events/CalendarHoverLabelContext";
import { worstUnresolved } from "@/utils/engineTones";
import {
  buildEngineMessageLookups,
  plannerIdFromPayload,
  renderEngineMessage,
} from "@/utils/renderEngineMessage";
import { getRootParentId } from "@/utils/goalPageHandlers";
import { type EngineTone } from "../_mock/calendar";
import { WeekStructureModal } from "@/components/calendar/WeekStructureModal";
import { EngineControls } from "./_components/EngineControls";
import "./_styles/fullcalendar.css";
import {
  page,
  subHeader,
  rangeTitle,
  navCluster,
  spacer,
  hoverChip,
  hoverChipDot,
  hoverChipName,
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
  engineCardLink,
  engineCardContent,
  engineDismissBtn,
  engineGoToBtn,
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

// Module-level so its identity is stable across renders. An inline arrow here
// counts as a changed FullCalendar option on every page render — and the page
// re-renders on every hover-label change, including from the drag mirror tile,
// so an option reset could land mid-drag and kill the interaction before
// eventDrop fired.
function renderDayHeader(arg: { date: Date; isToday: boolean }) {
  return (
    <div className={dayHeaderStack}>
      <span
        className={`${dayHeaderLabel} ${arg.isToday ? dayHeaderLabelToday : ""}`}
      >
        {format(arg.date, "EEE")}
      </span>
      <span
        className={`${dayHeaderNum} ${arg.isToday ? dayHeaderNumToday : ""}`}
      >
        {arg.date.getDate()}
      </span>
    </div>
  );
}

// Compact relative timestamp for the console header. Null means the engine
// hasn't run this session (cold load renders persisted output only).
function formatLastRun(iso: string | null): string {
  if (!iso) return "—";
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

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
  const { weekStartDay, manuallyRefreshCalendar, planner } =
    useCalendarProvider();
  const dispatch = useDispatch<AppDispatch>();
  const engineMessages = useSelector(
    (state: RootState) => state.engineOutput.engineMessages,
  );
  const calendarEvents = useSelector(
    (state: RootState) => state.engineOutput.calendar,
  );
  const locations = useSelector(
    (state: RootState) => state.schedulingSettings.locations,
  );
  const lastEngineRunAt = useSelector(
    (state: RootState) => state.engineOutput.lastEngineRunAt,
  );
  // Placed count is derived from live calendar state, not the SCHEDULED_OK
  // payload, so the header stays accurate after user edits (dismissed card,
  // pending regen). Both sources agree at emit time; only diverge in the
  // seam between an edit and the next regen.
  const placedCount = useMemo(
    () =>
      calendarEvents.filter((e) => e.extendedProps?.eventType === "planner")
        .length,
    [calendarEvents],
  );
  const renderedMessages = useMemo(() => {
    const lookups = buildEngineMessageLookups(planner, locations);
    // renderEngineMessage returns null for payload shapes we don't recognize
    // (e.g. a persisted row from a newer client version). Drop those rather
    // than showing an undefined card — no signal is better than a crash.
    // Dismissed rows stay in the array (so the engine can carry the flag
    // forward on the next regen) but never render.
    return engineMessages.flatMap((m) => {
      if (m.dismissed) return [];
      const rendered = renderEngineMessage(m, lookups);
      if (!rendered) return [];
      // Match the calendar popover's "Open full editor" behavior: drill to
      // the root ancestor, not the leaf. Item pages render the full tree
      // rooted at the URL id, so a leaf navigation would land on an
      // uninformative single-node page.
      const leafId = plannerIdFromPayload(m.payload);
      const drillTo = leafId
        ? (getRootParentId(planner, leafId) ?? leafId)
        : null;
      return [{ ...rendered, drillTo }];
    });
  }, [engineMessages, planner, locations]);
  const failCount = renderedMessages.filter((m) => m.tone === "fail").length;
  const warnCount = renderedMessages.filter((m) => m.tone === "warn").length;
  const handleDismiss = useCallback(
    (id: string) => dispatch(dismissEngineMessage(id)),
    [dispatch],
  );
  const handleGoToDate = useCallback(
    (iso: string) => {
      const target = new Date(iso);
      if (Number.isNaN(target.getTime())) return;
      setInitialDate(getWeekFirstDate(weekStartDay, target));
    },
    [weekStartDay],
  );
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
    } catch {
      // localStorage may be unavailable (private mode, disabled cookies)
    }
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
    } catch {
      // localStorage may be unavailable (private mode, quota exceeded)
    }
  }, [consoleCollapsed, hydrated]);

  const toggleConsole = () => setConsoleCollapsed((c) => !c);

  const alertTone: EngineTone | null = worstUnresolved(renderedMessages);

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
            <span className={hoverChip}>
              <span
                aria-hidden
                className={hoverChipDot}
                style={{ background: hoveredCategory.color ?? vars.muted }}
              />
              <span className={hoverChipName}>{hoveredCategory.name}</span>
            </span>
          )}
          <span className={spacer} />
          <div className={actionCluster}>
            <Button
              variant="glass"
              size="sm"
              onClick={() => setPlanOpen(true)}
              aria-label="Edit week templates and category windows"
            >
              <CalendarCog size={13} strokeWidth={2.2} />
              Week structure
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
                  dayHeaderContent={renderDayHeader}
                />
              </CalendarHoverLabelContext.Provider>
            </div>
          </div>

          <div className={engineCol}>
            <div className={engineContainer}>
              <div className={engineHeader}>
                <span className={engineLastRun}>
                  last run · {formatLastRun(lastEngineRunAt)}
                </span>
                <div className={engineSummary}>
                  {failCount} fail · {warnCount} warn · {placedCount} placed
                </div>
              </div>

              <div className={engineList}>
                {renderedMessages.map((m) => {
                  const tc = toneColor(m.tone);
                  return (
                    <div
                      key={m.id}
                      className={engineCard}
                      style={{
                        borderColor: `color-mix(in srgb, ${tc} 60%, transparent)`,
                      }}
                    >
                      {m.drillTo && (
                        <Link
                          href={`/items/${m.drillTo}`}
                          className={engineCardLink}
                          aria-label={`Open ${m.title}`}
                        >
                          {m.title}
                        </Link>
                      )}
                      {m.goToDate && (
                        <button
                          type="button"
                          className={engineGoToBtn}
                          onClick={() => handleGoToDate(m.goToDate!)}
                          aria-label="Go to date in calendar"
                          title="Go to date"
                        >
                          <Locate size={13} strokeWidth={2.2} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={engineDismissBtn}
                        onClick={() => handleDismiss(m.id)}
                        aria-label="Dismiss message"
                        title="Dismiss"
                      >
                        <X size={13} strokeWidth={2.2} />
                      </button>
                      <div className={engineCardContent}>
                        <div className={engineCardHead}>
                          <span className={engineTag} style={{ background: tc }}>
                            {m.tag}
                          </span>
                          <span className={engineCardTitle}>{m.title}</span>
                        </div>
                        <div className={engineCardBody}>{m.body}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <EngineControls />
            </div>
          </div>
        </div>

        <WeekStructureModal open={planOpen} onClose={() => setPlanOpen(false)} />
      </div>
    </div>
  );
}

