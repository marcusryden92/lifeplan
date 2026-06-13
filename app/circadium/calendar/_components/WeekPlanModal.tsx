"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventDropArg,
} from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { v4 as uuidv4 } from "uuid";
import { X } from "lucide-react";

import { Button, vars } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import type { Category, EventTemplate } from "@/types/prisma";
import type { WeekDayIntegers } from "@/types/calendarTypes";
import {
  getWeekFirstDate,
  shiftDate,
  setTimeOnDate,
} from "@/utils/calendarUtils";
import * as timeWindowActions from "@/actions/time-windows";
import type { TimeWindowRecord } from "@/actions/time-windows";

import {
  overlay,
  modal,
  MODAL_FADE_MS,
  banner,
  editingLabel,
  modeToggle,
  modeToggleThumb,
  modeToggleButton,
  bannerSummary,
  bannerSpacer,
  body,
  gridCol,
  gridHeader,
  gridTitle,
  gridSubtitle,
  calendarWrap,
  rail,
  selectedPanel,
  emptyPanel,
  selectedHeaderRow,
  selectedSwatch,
  selectedTitle,
  fieldGrid,
  field,
  fieldLabel,
  fieldInput,
  fieldStatic,
  swatchRow,
  swatchChip,
  categoryRow,
  categoryOption,
  categoryDot,
  selectedActions,
  errorBanner,
  errorDismiss,
  eventBox,
  eventTitle,
  eventTime,
} from "./WeekPlanModal.css";

type Mode = "templates" | "windows";

interface WeekPlanModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
  // When set, opens in windows mode with all other categories' windows
  // visually muted so the focused area's windows stand out.
  focusedCategoryId?: string | null;
}

const REFERENCE_WEEK_DATE = new Date(2024, 0, 1);
const WEEK_START_DAY: WeekDayIntegers = 1;
const UNASSIGNED_COLOR = "#9ca3af";

// Local working type widens TimeWindowRecord so newly-drawn drafts can hold
// categoryId === null until the user picks a category. Drafts are dropped on save.
type WorkingWindow = Omit<TimeWindowRecord, "categoryId"> & {
  categoryId: string | null;
};

const TEMPLATE_PALETTE = [
  "#d6cea2",
  "#9bb8d6",
  "#d6b9a2",
  "#b6cfa7",
  "#d6a2b9",
  "#a2c8d6",
  "#cccccc",
  "#c8a2d6",
];

function timeFromDate(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function endTimeFromDate(date: Date): string {
  if (date.getHours() === 0 && date.getMinutes() === 0) return "23:59";
  return timeFromDate(date);
}

function dateToWeekDay(date: Date): WeekDayIntegers {
  return date.getDay() as WeekDayIntegers;
}

function isSameDayOrMidnightEnd(start: Date, end: Date): boolean {
  if (start.toDateString() === end.toDateString()) return true;
  const nextMidnight = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 1,
  );
  return end.getTime() === nextMidnight.getTime();
}

function durationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((v) => parseInt(v, 10));
  return h * 60 + m;
}

function addMinutesToHHMM(hhmm: string, addMinutes: number): string {
  const total = timeToMinutes(hhmm) + addMinutes;
  const h = Math.floor(total / 60) % 24;
  const m = ((total % 60) + 60) % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function templateToEvent(
  tpl: EventTemplate,
  weekStart: Date,
  active: boolean,
): EventInput {
  const offset = (startDayAsInt(tpl) - WEEK_START_DAY + 7) % 7;
  const baseDate = shiftDate(weekStart, offset);
  const start = setTimeOnDate(baseDate, tpl.startTime);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + tpl.duration);
  return {
    id: `tpl:${tpl.id}`,
    title: tpl.title,
    start,
    end,
    backgroundColor: tpl.color || TEMPLATE_PALETTE[0],
    borderColor: "transparent",
    editable: active,
    extendedProps: {
      kind: "template",
      templateId: tpl.id,
      color: tpl.color || TEMPLATE_PALETTE[0],
      active,
    },
  };
}

function windowToEvent(
  win: WorkingWindow,
  weekStart: Date,
  categoryById: Map<string, Category>,
  active: boolean,
  focused: boolean,
): EventInput {
  const category = win.categoryId ? categoryById.get(win.categoryId) : null;
  const color = category?.color || UNASSIGNED_COLOR;
  const title = category?.name || "Unassigned";
  const offset = (win.day - WEEK_START_DAY + 7) % 7;
  const baseDate = shiftDate(weekStart, offset);
  const start = setTimeOnDate(baseDate, win.startTime);
  const end =
    win.endTime === "23:59"
      ? new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate() + 1,
        )
      : setTimeOnDate(baseDate, win.endTime);
  return {
    id: `win:${win.id}`,
    title,
    start,
    end,
    backgroundColor: color,
    borderColor: "transparent",
    editable: active,
    extendedProps: {
      kind: "window",
      windowId: win.id,
      color,
      active,
      assigned: !!win.categoryId,
      focused,
    },
  };
}

// EventTemplate.startDay arrives as either a WeekDayType string ("monday",...)
// from Prisma or as a WeekDayIntegers from local handlers — normalize here.
const WEEKDAY_STRING_TO_INT: Record<string, WeekDayIntegers> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function startDayAsInt(tpl: EventTemplate): WeekDayIntegers {
  const raw = tpl.startDay as unknown;
  if (typeof raw === "number") return raw as WeekDayIntegers;
  if (typeof raw === "string" && raw in WEEKDAY_STRING_TO_INT) {
    return WEEKDAY_STRING_TO_INT[raw];
  }
  return 1;
}

export function WeekPlanModal({
  open,
  onClose,
  initialMode = "templates",
  focusedCategoryId = null,
}: WeekPlanModalProps) {
  const { userId, template, categories, updateTemplateArray } =
    useCalendarProvider();
  const calendarRef = useRef<FullCalendar>(null);

  // Defer unmount on close so the fade-out animation plays. `shouldRender`
  // controls mount; `dataState` flips on the next frame to drive the CSS
  // transition both directions.
  const [shouldRender, setShouldRender] = useState(open);
  const [dataState, setDataState] = useState<"open" | "closed">(
    open ? "open" : "closed",
  );

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      const id = requestAnimationFrame(() => setDataState("open"));
      return () => cancelAnimationFrame(id);
    }
    setDataState("closed");
    const t = setTimeout(() => setShouldRender(false), MODAL_FADE_MS);
    return () => clearTimeout(t);
  }, [open]);

  const [mode, setMode] = useState<Mode>(initialMode);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tplsInitial, setTplsInitial] = useState<EventTemplate[]>([]);
  const [tplsWorking, setTplsWorking] = useState<EventTemplate[]>([]);
  const [winsInitial, setWinsInitial] = useState<WorkingWindow[]>([]);
  const [winsWorking, setWinsWorking] = useState<WorkingWindow[]>([]);

  const [selected, setSelected] = useState<{
    kind: Mode;
    id: string;
  } | null>(null);

  const categoryById = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const weekStart = useMemo(
    () => getWeekFirstDate(WEEK_START_DAY, REFERENCE_WEEK_DATE),
    [],
  );

  // Everything comes from Redux — templates directly, windows nested inside
  // each category's timeSlots. No server fetch needed on open.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelected(null);
    setTplsInitial(template);
    setTplsWorking(template);
    const initialWindows: WorkingWindow[] = categories.flatMap((c) =>
      c.timeSlots.map((ts) => ({
        id: ts.id,
        day: ts.day,
        startTime: ts.startTime,
        endTime: ts.endTime,
        categoryId: c.id,
      })),
    );
    setWinsInitial(initialWindows);
    setWinsWorking(initialWindows);
  }, [open, template, categories]);

  // Build event list
  const events: EventInput[] = useMemo(() => {
    const out: EventInput[] = [];
    for (const tpl of tplsWorking) {
      out.push(templateToEvent(tpl, weekStart, mode === "templates"));
    }
    for (const win of winsWorking) {
      const focused =
        focusedCategoryId === null || win.categoryId === focusedCategoryId;
      out.push(
        windowToEvent(win, weekStart, categoryById, mode === "windows", focused),
      );
    }
    return out;
  }, [tplsWorking, winsWorking, weekStart, categoryById, mode, focusedCategoryId]);

  // Selection helpers
  const selectedTemplate = useMemo(
    () =>
      selected?.kind === "templates"
        ? tplsWorking.find((t) => t.id === selected.id) ?? null
        : null,
    [selected, tplsWorking],
  );
  const selectedWindow = useMemo(
    () =>
      selected?.kind === "windows"
        ? winsWorking.find((w) => w.id === selected.id) ?? null
        : null,
    [selected, winsWorking],
  );

  // Diff counters
  const changeCount = useMemo(() => {
    const sig = (t: EventTemplate) =>
      JSON.stringify([
        t.id,
        t.title,
        startDayAsInt(t),
        t.startTime,
        t.duration,
        t.color,
      ]);
    const tplSet = new Set(tplsInitial.map(sig));
    let n = 0;
    for (const t of tplsWorking) if (!tplSet.has(sig(t))) n++;
    for (const t of tplsInitial)
      if (!tplsWorking.find((w) => w.id === t.id)) n++;
    const wsig = (w: WorkingWindow) =>
      JSON.stringify([w.id, w.day, w.startTime, w.endTime, w.categoryId]);
    const winSet = new Set(winsInitial.map(wsig));
    for (const w of winsWorking) if (!winSet.has(wsig(w))) n++;
    for (const w of winsInitial)
      if (!winsWorking.find((x) => x.id === w.id)) n++;
    return n;
  }, [tplsInitial, tplsWorking, winsInitial, winsWorking]);

  // FullCalendar handlers
  const handleSelect = useCallback(
    (info: DateSelectArg) => {
      if (!isSameDayOrMidnightEnd(info.start, info.end)) {
        calendarRef.current?.getApi().unselect();
        return;
      }
      const startTime = timeFromDate(info.start);
      const endTime = endTimeFromDate(info.end);
      const day = dateToWeekDay(info.start);
      calendarRef.current?.getApi().unselect();

      if (mode === "templates") {
        const id = `tmp-${uuidv4()}`;
        const dur = durationMinutes(info.start, info.end);
        const now = new Date().toISOString();
        const newTpl = {
          id,
          userId: userId || "",
          title: "New block",
          startDay: day,
          startTime,
          duration: dur,
          color: TEMPLATE_PALETTE[
            tplsWorking.length % TEMPLATE_PALETTE.length
          ],
          locationId: null,
          createdAt: now,
          updatedAt: now,
        } as unknown as EventTemplate;
        setTplsWorking((prev) => [...prev, newTpl]);
        setSelected({ kind: "templates", id });
      } else {
        const id = `tmp-${uuidv4()}`;
        const newWin: WorkingWindow = {
          id,
          day,
          startTime,
          endTime,
          categoryId: null,
        };
        setWinsWorking((prev) => [...prev, newWin]);
        setSelected({ kind: "windows", id });
      }
    },
    [mode, userId, tplsWorking.length],
  );

  const windowRangeOverlaps = useCallback(
    (start: Date, end: Date, excludeWindowId: string | null) => {
      const day = dateToWeekDay(start);
      const startMin = start.getHours() * 60 + start.getMinutes();
      const endMin =
        end.getHours() === 0 && end.getMinutes() === 0
          ? 24 * 60
          : end.getHours() * 60 + end.getMinutes();
      for (const w of winsWorking) {
        if (w.id === excludeWindowId) continue;
        if (w.day !== day) continue;
        const wStart = timeToMinutes(w.startTime);
        const wEnd = w.endTime === "23:59" ? 24 * 60 : timeToMinutes(w.endTime);
        if (startMin < wEnd && endMin > wStart) return true;
      }
      return false;
    },
    [winsWorking],
  );

  const handleEventClick = useCallback((info: EventClickArg) => {
    const ext = info.event.extendedProps as {
      kind: "template" | "window";
      templateId?: string;
      windowId?: string;
      active?: boolean;
    };
    if (!ext.active) return;
    if (ext.kind === "template" && ext.templateId) {
      setSelected({ kind: "templates", id: ext.templateId });
    } else if (ext.kind === "window" && ext.windowId) {
      setSelected({ kind: "windows", id: ext.windowId });
    }
  }, []);

  const handleEventDrop = useCallback((info: EventDropArg) => {
    const ext = info.event.extendedProps as {
      kind: "template" | "window";
      templateId?: string;
      windowId?: string;
    };
    const start = info.event.start;
    const end = info.event.end;
    if (!start || !end) return;
    if (!isSameDayOrMidnightEnd(start, end)) {
      info.revert();
      return;
    }
    const newStartTime = timeFromDate(start);
    const newEndTime = endTimeFromDate(end);
    const newDay = dateToWeekDay(start);

    if (ext.kind === "template" && ext.templateId) {
      const dur = durationMinutes(start, end);
      setTplsWorking((prev) =>
        prev.map((t) =>
          t.id === ext.templateId
            ? ({
                ...t,
                startDay: newDay,
                startTime: newStartTime,
                duration: dur,
                updatedAt: new Date().toISOString(),
              } as EventTemplate)
            : t,
        ),
      );
    } else if (ext.kind === "window" && ext.windowId) {
      setWinsWorking((prev) =>
        prev.map((w) =>
          w.id === ext.windowId
            ? {
                ...w,
                day: newDay,
                startTime: newStartTime,
                endTime: newEndTime,
              }
            : w,
        ),
      );
    }
  }, []);

  const handleEventResize = useCallback((info: EventResizeDoneArg) => {
    const ext = info.event.extendedProps as {
      kind: "template" | "window";
      templateId?: string;
      windowId?: string;
    };
    const start = info.event.start;
    const end = info.event.end;
    if (!start || !end) return;
    if (!isSameDayOrMidnightEnd(start, end)) {
      info.revert();
      return;
    }
    const newStartTime = timeFromDate(start);
    const newEndTime = endTimeFromDate(end);
    if (ext.kind === "template" && ext.templateId) {
      const dur = durationMinutes(start, end);
      setTplsWorking((prev) =>
        prev.map((t) =>
          t.id === ext.templateId
            ? ({
                ...t,
                startTime: newStartTime,
                duration: dur,
                updatedAt: new Date().toISOString(),
              } as EventTemplate)
            : t,
        ),
      );
    } else if (ext.kind === "window" && ext.windowId) {
      setWinsWorking((prev) =>
        prev.map((w) =>
          w.id === ext.windowId
            ? { ...w, startTime: newStartTime, endTime: newEndTime }
            : w,
        ),
      );
    }
  }, []);

  // Field editors
  const updateTemplate = (
    id: string,
    patch: Partial<EventTemplate>,
  ) => {
    setTplsWorking((prev) =>
      prev.map((t) =>
        t.id === id
          ? ({ ...t, ...patch, updatedAt: new Date().toISOString() } as EventTemplate)
          : t,
      ),
    );
  };

  const updateWindow = (id: string, patch: Partial<WorkingWindow>) => {
    setWinsWorking((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    );
  };

  const deleteSelected = () => {
    if (!selected) return;
    if (selected.kind === "templates") {
      setTplsWorking((prev) => prev.filter((t) => t.id !== selected.id));
    } else {
      setWinsWorking((prev) => prev.filter((w) => w.id !== selected.id));
    }
    setSelected(null);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    if (selected.kind === "templates") {
      const src = tplsWorking.find((t) => t.id === selected.id);
      if (!src) return;
      const id = `tmp-${uuidv4()}`;
      const now = new Date().toISOString();
      const copy = { ...src, id, createdAt: now, updatedAt: now } as EventTemplate;
      setTplsWorking((prev) => [...prev, copy]);
      setSelected({ kind: "templates", id });
    } else {
      const src = winsWorking.find((w) => w.id === selected.id);
      if (!src) return;
      const id = `tmp-${uuidv4()}`;
      setWinsWorking((prev) => [...prev, { ...src, id }]);
      setSelected({ kind: "windows", id });
    }
  };

  // Save logic
  const saveAll = async () => {
    setSaving(true);
    setError(null);
    try {
      // Apply window diff to server
      const initialMap = new Map(winsInitial.map((w) => [w.id, w]));
      const workingIds = new Set(winsWorking.map((w) => w.id));

      // Deletes
      for (const w of winsInitial) {
        if (!workingIds.has(w.id)) {
          await timeWindowActions.deleteTimeWindow(w.id);
        }
      }
      // Creates + updates. Unassigned drafts (categoryId === null) are dropped
      // on save — only assigned windows persist.
      const persistedWindows: TimeWindowRecord[] = [];
      for (const w of winsWorking) {
        if (w.categoryId === null) continue;
        if (w.id.startsWith("tmp-")) {
          const created = await timeWindowActions.createTimeWindow({
            day: w.day,
            startTime: w.startTime,
            endTime: w.endTime,
            categoryId: w.categoryId,
          });
          persistedWindows.push(created);
        } else {
          const orig = initialMap.get(w.id);
          const same =
            orig &&
            orig.day === w.day &&
            orig.startTime === w.startTime &&
            orig.endTime === w.endTime &&
            orig.categoryId === w.categoryId;
          if (!same) {
            const updated = await timeWindowActions.updateTimeWindow(w.id, {
              day: w.day,
              startTime: w.startTime,
              endTime: w.endTime,
              categoryId: w.categoryId,
            });
            persistedWindows.push(updated);
          } else {
            persistedWindows.push(w);
          }
        }
      }
      setWinsInitial(persistedWindows);
      setWinsWorking(persistedWindows);

      // Commit templates through Redux; CalendarServerSync handles persistence.
      // Strip tmp- ids and replace with uuids so server treats as new.
      const stamped: EventTemplate[] = tplsWorking.map((t) => {
        if (t.id.startsWith("tmp-")) {
          const { id: _stripped, ...rest } = t;
          return { ...rest, id: uuidv4() } as EventTemplate;
        }
        return t;
      });
      updateTemplateArray(stamped);
      setTplsInitial(stamped);
      setTplsWorking(stamped);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (changeCount > 0) {
      const ok = window.confirm(
        `Discard ${changeCount} unsaved change${changeCount === 1 ? "" : "s"}?`,
      );
      if (!ok) return;
    }
    onClose();
  };

  if (!shouldRender) return null;

  const tplCount = tplsWorking.length;
  const winCount = winsWorking.length;

  return (
    <div
      className={overlay}
      data-state={dataState}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <div className={modal}>
        <div className={banner}>
          <span className={editingLabel}>editing</span>
          <div className={modeToggle}>
            <span
              className={modeToggleThumb}
              data-position={mode === "templates" ? "0" : "1"}
              aria-hidden="true"
            />
            <button
              type="button"
              className={modeToggleButton}
              data-active={mode === "templates"}
              onClick={() => {
                setMode("templates");
                setSelected(null);
              }}
            >
              Templates
            </button>
            <button
              type="button"
              className={modeToggleButton}
              data-active={mode === "windows"}
              onClick={() => {
                setMode("windows");
                setSelected(null);
              }}
            >
              Categories
            </button>
          </div>
          <span className={bannerSummary}>
            {mode === "templates"
              ? `${tplCount} template${tplCount === 1 ? "" : "s"}`
              : `${winCount} window${winCount === 1 ? "" : "s"}`}
          </span>
          <span className={bannerSpacer} />
          <Button variant="glass" size="sm" onClick={cancel} disabled={saving}>
            {changeCount === 0 ? "Back" : "Cancel"}
          </Button>
          <Button
            variant="solid"
            size="sm"
            onClick={saveAll}
            disabled={saving || changeCount === 0}
          >
            {saving
              ? "Saving…"
              : changeCount === 0
                ? "Save"
                : `Save · ${changeCount} change${changeCount === 1 ? "" : "s"}`}
          </Button>
        </div>

        {error && (
          <div className={errorBanner}>
            <span style={{ flex: 1 }}>{error}</span>
            <button
              type="button"
              className={errorDismiss}
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        )}

        <div className={body}>
          <div className={gridCol}>
            <div className={gridHeader}>
              <h2 className={gridTitle}>Your typical week</h2>
              <span className={gridSubtitle}>
                drag on the grid to draw new · click a block to edit
              </span>
            </div>

            <div className={`${calendarWrap} week-plan-fc`}>
              <FullCalendar
                  ref={calendarRef}
                  initialDate={REFERENCE_WEEK_DATE}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  events={events}
                  initialView="timeGridWeek"
                  firstDay={WEEK_START_DAY}
                  snapDuration="00:15:00"
                  slotDuration="00:30:00"
                  scrollTime="06:00:00"
                  height="100%"
                  headerToolbar={false}
                  slotLabelFormat={{
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  }}
                  eventTimeFormat={{
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  }}
                  editable={true}
                  eventResizableFromStart={true}
                  eventOverlap={true}
                  selectable={true}
                  selectMirror={true}
                  selectAllow={(info) => {
                    if (!isSameDayOrMidnightEnd(info.start, info.end))
                      return false;
                    if (
                      mode === "windows" &&
                      windowRangeOverlaps(info.start, info.end, null)
                    )
                      return false;
                    return true;
                  }}
                  eventAllow={(info, draggedEvent) => {
                    if (!info.start || !info.end) return false;
                    if (!isSameDayOrMidnightEnd(info.start, info.end))
                      return false;
                    const ext = draggedEvent?.extendedProps as
                      | {
                          kind?: "template" | "window";
                          windowId?: string;
                        }
                      | undefined;
                    if (ext?.kind === "window") {
                      if (
                        windowRangeOverlaps(
                          info.start,
                          info.end,
                          ext.windowId ?? null,
                        )
                      )
                        return false;
                    }
                    return true;
                  }}
                  allDaySlot={false}
                  dayHeaderFormat={{ weekday: "short" }}
                  select={handleSelect}
                  eventClick={handleEventClick}
                  eventDrop={handleEventDrop}
                  eventResize={handleEventResize}
                  eventContent={({ event, timeText }) => {
                    const ext = event.extendedProps as {
                      kind: "template" | "window";
                      templateId?: string;
                      windowId?: string;
                      color: string;
                      active: boolean;
                      assigned?: boolean;
                      focused?: boolean;
                    };
                    const isWindow = ext.kind === "window";
                    const bg = isWindow
                      ? `repeating-linear-gradient(45deg, transparent 0 6px, ${ext.color} 6px 7.5px), ${
                          ext.assigned
                            ? `color-mix(in srgb, ${ext.color} 80%, transparent)`
                            : `color-mix(in srgb, ${vars.ink} 8%, transparent)`
                        }`
                      : ext.color;
                    const isSelected =
                      selected !== null &&
                      ((selected.kind === "templates" &&
                        ext.kind === "template" &&
                        ext.templateId === selected.id) ||
                        (selected.kind === "windows" &&
                          ext.kind === "window" &&
                          ext.windowId === selected.id));
                    return (
                      <div
                        className={eventBox}
                        data-kind={ext.kind}
                        data-assigned={ext.assigned ? "true" : "false"}
                        data-inactive={ext.active ? "false" : "true"}
                        data-selected={isSelected ? "true" : "false"}
                        data-defocused={
                          ext.kind === "window" && ext.focused === false
                            ? "true"
                            : "false"
                        }
                        style={{ background: bg }}
                      >
                        <div className={eventTitle}>{event.title}</div>
                        {timeText && (
                          <div className={eventTime}>{timeText}</div>
                        )}
                      </div>
                    );
                  }}
                />
            </div>
          </div>

          <div className={rail}>
            {selectedTemplate ? (
              <TemplateEditor
                template={selectedTemplate}
                onUpdate={(patch) => updateTemplate(selectedTemplate.id, patch)}
                onDuplicate={duplicateSelected}
                onDelete={deleteSelected}
              />
            ) : selectedWindow ? (
              <WindowEditor
                window={selectedWindow}
                categories={categories}
                onUpdate={(patch) => updateWindow(selectedWindow.id, patch)}
                onDuplicate={duplicateSelected}
                onDelete={deleteSelected}
              />
            ) : (
              <div className={emptyPanel}>
                Click any {mode === "templates" ? "template" : "window"} block
                to edit it, or drag on the grid to draw a new one.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TemplateEditorProps {
  template: EventTemplate;
  onUpdate: (patch: Partial<EventTemplate>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function TemplateEditor({
  template,
  onUpdate,
  onDuplicate,
  onDelete,
}: TemplateEditorProps) {
  return (
    <div className={selectedPanel}>
      <div className={selectedHeaderRow}>
        <span
          className={selectedSwatch}
          style={{ background: template.color || TEMPLATE_PALETTE[0] }}
        />
        <span className={selectedTitle}>{template.title || "Untitled"}</span>
      </div>

      <div className={field} style={{ marginBottom: 8 }}>
        <span className={fieldLabel}>name</span>
        <input
          className={fieldInput}
          value={template.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
      </div>

      <div className={fieldGrid}>
        <div className={field}>
          <span className={fieldLabel}>start</span>
          <span className={fieldStatic}>{template.startTime}</span>
        </div>
        <div className={field}>
          <span className={fieldLabel}>end</span>
          <span className={fieldStatic}>
            {addMinutesToHHMM(template.startTime, template.duration)}
          </span>
        </div>
      </div>

      <div className={field} style={{ marginBottom: 8 }}>
        <span className={fieldLabel}>color</span>
        <div className={swatchRow}>
          {TEMPLATE_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className={swatchChip}
              data-active={template.color === c}
              style={{ background: c }}
              onClick={() => onUpdate({ color: c })}
              aria-label={`color ${c}`}
            />
          ))}
        </div>
      </div>

      <div className={selectedActions}>
        <Button variant="glass" size="sm" onClick={onDuplicate}>
          Duplicate
        </Button>
        <Button
          variant="glass"
          size="sm"
          onClick={onDelete}
          style={{ color: vars.status.error }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

interface WindowEditorProps {
  window: WorkingWindow;
  categories: Category[];
  onUpdate: (patch: Partial<WorkingWindow>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function WindowEditor({
  window: win,
  categories,
  onUpdate,
  onDuplicate,
  onDelete,
}: WindowEditorProps) {
  const cat = win.categoryId
    ? categories.find((c) => c.id === win.categoryId)
    : null;
  return (
    <div className={selectedPanel}>
      <div className={selectedHeaderRow}>
        <span
          className={selectedSwatch}
          style={{ background: cat?.color || UNASSIGNED_COLOR }}
        />
        <span className={selectedTitle}>{cat?.name || "Unassigned"}</span>
      </div>

      <div className={fieldGrid}>
        <div className={field}>
          <span className={fieldLabel}>start</span>
          <span className={fieldStatic}>{win.startTime}</span>
        </div>
        <div className={field}>
          <span className={fieldLabel}>end</span>
          <span className={fieldStatic}>{win.endTime}</span>
        </div>
      </div>

      <div className={field} style={{ marginBottom: 8 }}>
        <span className={fieldLabel}>category</span>
        <div className={categoryRow}>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={categoryOption}
              data-active={win.categoryId === c.id}
              onClick={() => onUpdate({ categoryId: c.id })}
            >
              <span
                className={categoryDot}
                style={{ background: c.color || UNASSIGNED_COLOR }}
              />
              {c.name}
            </button>
          ))}
        </div>
        {win.categoryId === null && (
          <span
            style={{
              fontSize: 10.5,
              color: vars.muted,
              marginTop: 6,
              fontFamily: vars.font.ui,
            }}
          >
            Pick a category — unassigned windows are discarded on save.
          </span>
        )}
      </div>

      <div className={selectedActions}>
        <Button variant="glass" size="sm" onClick={onDuplicate}>
          Duplicate
        </Button>
        <Button
          variant="glass"
          size="sm"
          onClick={onDelete}
          style={{ color: vars.status.error }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
