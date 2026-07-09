"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  DateSelectArg,
  EventClickArg,
  EventDropArg,
} from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { v4 as uuidv4 } from "uuid";
import { addDays, format } from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import * as Dialog from "@radix-ui/react-dialog";
import { Button, Backdrop, ConfirmModal, Grain } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { Category, EventTemplate } from "@/types/prisma";
import { getWeekFirstDate } from "@/utils/calendarUtils";

import { REFERENCE_WEEK_DATE, TEMPLATE_PALETTE } from "./constants";
import {
  dateToWeekDay,
  durationMinutes,
  endTimeFromDate,
  timeFromDate,
  windowRangeOverlaps,
  type WorkingWindow,
} from "./timeWindow";
import { templateToEvent, windowToEvent } from "./eventSerializers";
import { useWeekStructureState } from "./useWeekStructureState";
import { TemplateEditor } from "./TemplateEditor";
import { WindowEditor } from "./WindowEditor";
import { EventTile } from "./EventTile";

import {
  overlay,
  modal,
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
  dayNav,
  dayNavBtn,
  dayNavLabel,
  calendarWrap,
  rail,
  emptyPanel,
  errorBanner,
  errorBannerMessage,
  errorDismiss,
  cancelButtonStyle,
  a11yHiddenTitle,
  discardConfirmBody,
} from "./WeekStructureModal.css";

type Mode = "templates" | "windows";

// Templates and windows may both run past midnight (an overnight sleep block
// or a 23:00-07:00 window); each is capped at 24h so a block can't overrun its
// own next weekly occurrence. Window overlap is enforced separately.
function rangeAllowed(start: Date, end: Date): boolean {
  return end > start && durationMinutes(start, end) <= 24 * 60;
}

interface WeekStructureModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
  // When set, opens in windows mode with all other categories' windows
  // visually muted so the focused area's windows stand out.
  focusedCategoryId?: string | null;
}

export function WeekStructureModal({
  open,
  onClose,
  initialMode = "templates",
  focusedCategoryId = null,
}: WeekStructureModalProps) {
  const { userId, categories, weekStartDay } = useCalendarProvider();
  const calendarRef = useRef<FullCalendar>(null);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [selected, setSelected] = useState<{
    kind: Mode;
    id: string;
  } | null>(null);

  const {
    saving,
    error,
    setError,
    tplsWorking,
    setTplsWorking,
    winsWorking,
    setWinsWorking,
    changeCount,
    saveAll,
  } = useWeekStructureState({ open, onClose });

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setSelected(null);
    }
  }, [open, initialMode]);

  const categoryById = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const weekStart = useMemo(
    () => getWeekFirstDate(weekStartDay, REFERENCE_WEEK_DATE),
    [weekStartDay],
  );

  // Mobile shows one drawable day at a time — seven ~45px columns are too
  // small to read or draw on with a finger. The index is an offset into the
  // reference week, initialized to today's weekday.
  const isMobile = useIsMobile();
  const [mobileDayIdx, setMobileDayIdx] = useState(0);
  useEffect(() => {
    if (open) {
      setMobileDayIdx((new Date().getDay() - weekStartDay + 7) % 7);
    }
  }, [open, weekStartDay]);
  useEffect(() => {
    if (!open) return;
    // Deferred: FullCalendar flushSyncs on API calls, which React warns about
    // inside an effect's commit phase.
    const timeout = setTimeout(() => {
      const api = calendarRef.current?.getApi();
      if (!api) return;
      if (isMobile) {
        api.changeView("timeGridDay", addDays(weekStart, mobileDayIdx));
      } else if (api.view.type !== "timeGridWeek") {
        api.changeView("timeGridWeek", weekStart);
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [open, isMobile, mobileDayIdx, weekStart]);

  const events = useMemo(() => {
    const out = [];
    for (const tpl of tplsWorking) {
      out.push(
        templateToEvent(tpl, weekStart, weekStartDay, mode === "templates"),
      );
    }
    for (const win of winsWorking) {
      const focused =
        focusedCategoryId === null || win.categoryId === focusedCategoryId;
      out.push(
        windowToEvent(
          win,
          weekStart,
          weekStartDay,
          categoryById,
          mode === "windows",
          focused,
        ),
      );
    }
    return out;
  }, [
    tplsWorking,
    winsWorking,
    weekStart,
    weekStartDay,
    categoryById,
    mode,
    focusedCategoryId,
  ]);

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

  const handleSelect = useCallback(
    (info: DateSelectArg) => {
      if (!rangeAllowed(info.start, info.end)) {
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
          color:
            TEMPLATE_PALETTE[tplsWorking.length % TEMPLATE_PALETTE.length],
          locationId: null,
          recurrenceExceptions: null,
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
          recurrenceExceptions: null,
        };
        setWinsWorking((prev) => [...prev, newWin]);
        setSelected({ kind: "windows", id });
      }
    },
    [mode, userId, tplsWorking.length, setTplsWorking, setWinsWorking],
  );

  const overlapsWindow = useCallback(
    (start: Date, end: Date, excludeWindowId: string | null) =>
      windowRangeOverlaps(winsWorking, start, end, excludeWindowId),
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

  const handleEventDrop = useCallback(
    (info: EventDropArg) => {
      const ext = info.event.extendedProps as {
        kind: "template" | "window";
        templateId?: string;
        windowId?: string;
      };
      const start = info.event.start;
      const end = info.event.end;
      if (!start || !end) return;
      if (!rangeAllowed(start, end)) {
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
                  // A series re-anchor invalidates per-occurrence exceptions —
                  // their keys point at the old weekly pattern (stale exdates
                  // resurrect deleted occurrences, moved one-offs go ghost).
                  recurrenceExceptions:
                    newDay !== t.startDay || newStartTime !== t.startTime
                      ? null
                      : t.recurrenceExceptions,
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
                  // Same re-anchor rule as templates above: exception keys
                  // point at the old weekly pattern.
                  recurrenceExceptions:
                    newDay !== w.day || newStartTime !== w.startTime
                      ? null
                      : w.recurrenceExceptions,
                }
              : w,
          ),
        );
      }
    },
    [setTplsWorking, setWinsWorking],
  );

  const handleEventResize = useCallback(
    (info: EventResizeDoneArg) => {
      const ext = info.event.extendedProps as {
        kind: "template" | "window";
        templateId?: string;
        windowId?: string;
      };
      const start = info.event.start;
      const end = info.event.end;
      if (!start || !end) return;
      if (!rangeAllowed(start, end)) {
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
                  // Start-edge resize re-anchors the weekly start time — see
                  // the exception clear in handleEventDrop above.
                  recurrenceExceptions:
                    newStartTime !== t.startTime
                      ? null
                      : t.recurrenceExceptions,
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
                  startTime: newStartTime,
                  endTime: newEndTime,
                  recurrenceExceptions:
                    newStartTime !== w.startTime
                      ? null
                      : w.recurrenceExceptions,
                }
              : w,
          ),
        );
      }
    },
    [setTplsWorking, setWinsWorking],
  );

  const updateTemplate = (id: string, patch: Partial<EventTemplate>) => {
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
      // Exceptions reference specific occurrences of the source rule.
      setWinsWorking((prev) => [
        ...prev,
        { ...src, id, recurrenceExceptions: null },
      ]);
      setSelected({ kind: "windows", id });
    }
  };

  const cancel = () => {
    if (changeCount > 0) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };

  const tplCount = tplsWorking.length;
  const winCount = winsWorking.length;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) cancel();
      }}
    >
      <Dialog.Overlay className={overlay} />
      <Dialog.Content
        className={modal}
        aria-describedby={undefined}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <Dialog.Title className={a11yHiddenTitle}>Week Structure</Dialog.Title>
        <Backdrop variant="blob" />
        <Grain />
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
          <Button
            variant="ghost"
            size="sm"
            onClick={cancel}
            disabled={saving}
            className={cancelButtonStyle}
          >
            {changeCount === 0 ? "Back" : "Cancel"}
          </Button>
          <Button
            variant="solidLight"
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
            <span className={errorBannerMessage}>{error}</span>
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
              <span className={dayNav}>
                <button
                  type="button"
                  className={dayNavBtn}
                  onClick={() => setMobileDayIdx((i) => (i + 6) % 7)}
                  aria-label="Previous day"
                >
                  <ChevronLeft size={14} strokeWidth={2} />
                </button>
                <span className={dayNavLabel}>
                  {format(addDays(weekStart, mobileDayIdx), "EEEE")}
                </span>
                <button
                  type="button"
                  className={dayNavBtn}
                  onClick={() => setMobileDayIdx((i) => (i + 1) % 7)}
                  aria-label="Next day"
                >
                  <ChevronRight size={14} strokeWidth={2} />
                </button>
              </span>
            </div>

            <div className={`${calendarWrap} week-structure-fc`}>
              <FullCalendar
                ref={calendarRef}
                initialDate={REFERENCE_WEEK_DATE}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                events={events}
                initialView="timeGridWeek"
                firstDay={weekStartDay}
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
                  if (!rangeAllowed(info.start, info.end)) return false;
                  if (
                    mode === "windows" &&
                    overlapsWindow(info.start, info.end, null)
                  )
                    return false;
                  return true;
                }}
                eventAllow={(info, draggedEvent) => {
                  if (!info.start || !info.end) return false;
                  if (!rangeAllowed(info.start, info.end)) return false;
                  const ext = draggedEvent?.extendedProps as
                    | {
                        kind?: "template" | "window";
                        windowId?: string;
                      }
                    | undefined;
                  if (ext?.kind === "window") {
                    if (
                      overlapsWindow(
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
                  const isSelected =
                    selected !== null &&
                    ((selected.kind === "templates" &&
                      ext.kind === "template" &&
                      ext.templateId === selected.id) ||
                      (selected.kind === "windows" &&
                        ext.kind === "window" &&
                        ext.windowId === selected.id));
                  return (
                    <EventTile
                      title={event.title}
                      timeText={timeText}
                      kind={ext.kind}
                      color={ext.color}
                      active={ext.active}
                      assigned={ext.assigned}
                      focused={ext.focused}
                      selected={isSelected}
                    />
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

        <ConfirmModal
          open={showDiscardConfirm}
          title="Discard unsaved changes?"
          body={
            <p className={discardConfirmBody}>
              You have {changeCount} unsaved change
              {changeCount === 1 ? "" : "s"}. Closing now will lose them.
            </p>
          }
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          tone="danger"
          onCancel={() => setShowDiscardConfirm(false)}
          onConfirm={() => {
            setShowDiscardConfirm(false);
            onClose();
          }}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
