"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CalendarCog,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { useDispatch, useSelector } from "react-redux";
import { Button, ConicDot, vars } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { getWeekFirstDate, shiftDate } from "@/utils/calendarUtils";
import Calendar from "@/app/(protected)/calendar/components/Calendar";
import {
  setBufferTimeMinutes as setBufferTimeMinutesAction,
  setStrategyWeights,
} from "@/redux/slices/schedulingSettingsSlice";
import { updateUserSchedulingPreferences } from "@/actions/scheduling";
import type { AppDispatch, RootState } from "@/redux/store";
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
  engineControls,
  engineControlsTitle,
  controlRow,
  controlHead,
  controlLabel,
  controlValue,
  controlSlider,
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

  const alertTone = worstUnresolved();

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
            <div className={`${fcWrap} lumen-calendar`}>
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

function EngineControls() {
  const dispatch = useDispatch<AppDispatch>();
  const { manuallyRefreshCalendar } = useCalendarProvider();
  const reduxBuffer = useSelector(
    (state: RootState) => state.schedulingSettings.bufferTimeMinutes,
  );
  const weights = useSelector(
    (state: RootState) =>
      state.schedulingSettings.debugStrategyConfig.weights,
  );

  const [bufferDraft, setBufferDraft] = useState<string>(String(reduxBuffer));
  useEffect(() => {
    setBufferDraft(String(reduxBuffer));
  }, [reduxBuffer]);

  // Debounce calendar refresh + DB persistence so a sliding/typing burst
  // doesn't fire a regeneration per tick.
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(manuallyRefreshCalendar, 200);
  }, [manuallyRefreshCalendar]);

  const BUFFER_MIN = 0;
  const BUFFER_MAX = 30;
  const BUFFER_STEP = 1;
  const bufferPersistRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleBufferCommit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setBufferDraft(String(reduxBuffer));
      return;
    }
    const clamped = Math.max(BUFFER_MIN, Math.min(BUFFER_MAX, parsed));
    setBufferDraft(String(clamped));
    if (clamped === reduxBuffer) return;
    dispatch(setBufferTimeMinutesAction(clamped));
    if (bufferPersistRef.current) clearTimeout(bufferPersistRef.current);
    bufferPersistRef.current = setTimeout(() => {
      updateUserSchedulingPreferences({ bufferTimeMinutes: clamped }).catch(
        (err) => {
          console.error("Failed to persist buffer time:", err);
        },
      );
    }, 400);
  };

  const handleWeightChange = (
    key: "earliestSlot" | "locationGrouping",
    value: number,
  ) => {
    dispatch(setStrategyWeights({ [key]: value }));
    scheduleRefresh();
  };

  // Slider fires onChange per drag tick. Commit immediately to local draft so
  // the readout follows the thumb, but debounce the Redux dispatch (which
  // triggers a full calendar regen via CalendarProvider) until the user pauses.
  const sliderDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleBufferSlide = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    setBufferDraft(String(parsed));
    if (sliderDebounceRef.current) clearTimeout(sliderDebounceRef.current);
    sliderDebounceRef.current = setTimeout(() => {
      handleBufferCommit(String(parsed));
    }, 200);
  };

  return (
    <div className={engineControls}>
      <span className={engineControlsTitle}>Tuning</span>

      <div className={controlRow}>
        <div className={controlHead}>
          <span className={controlLabel}>Buffer between items</span>
          <span className={controlValue}>
            {parseInt(bufferDraft, 10) || 0} min
          </span>
        </div>
        <input
          type="range"
          min={BUFFER_MIN}
          max={BUFFER_MAX}
          step={BUFFER_STEP}
          value={parseInt(bufferDraft, 10) || 0}
          onChange={(e) => handleBufferSlide(e.target.value)}
          className={controlSlider}
        />
      </div>

      <div className={controlRow}>
        <div className={controlHead}>
          <span className={controlLabel}>Earliest slot</span>
          <span className={controlValue}>{weights.earliestSlot.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={0.01}
          value={weights.earliestSlot}
          onChange={(e) =>
            handleWeightChange("earliestSlot", parseFloat(e.target.value))
          }
          className={controlSlider}
        />
      </div>

      <div className={controlRow}>
        <div className={controlHead}>
          <span className={controlLabel}>Location grouping</span>
          <span className={controlValue}>
            {weights.locationGrouping.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.01}
          value={weights.locationGrouping}
          onChange={(e) =>
            handleWeightChange("locationGrouping", parseFloat(e.target.value))
          }
          className={controlSlider}
        />
      </div>
    </div>
  );
}
