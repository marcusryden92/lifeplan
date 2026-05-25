"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { X, FolderTree } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import type { Category } from "@/types/prisma";
import type { WeekDayIntegers } from "@/types/calendarTypes";
import {
  getWeekFirstDate,
  shiftDate,
  setTimeOnDate,
} from "@/utils/calendarUtils";
import { buildCategoryTree, type CategoryNode } from "@/utils/categoryUtils";
import * as categoryActions from "@/actions/categories";
import * as timeWindowActions from "@/actions/time-windows";
import type { TimeWindowRecord } from "@/actions/time-windows";

const REFERENCE_WEEK_DATE = new Date(2024, 0, 1);
const UNASSIGNED_COLOR = "#9ca3af";
// Mirror the value hardcoded in CalendarProvider. Promote to user setting if/when
// the provider's weekStartDay becomes configurable.
const WEEK_START_DAY: WeekDayIntegers = 1;

interface VisualBlock {
  key: string;
  windowId: string;
  day: WeekDayIntegers;
  startTime: string;
  endTime: string;
  categoryId: string | null;
  recordHasMultipleDays: boolean;
}

interface TimeWindowPlacementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function timeFromDate(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function endTimeFromDate(date: Date): string {
  if (date.getHours() === 0 && date.getMinutes() === 0) return "23:59";
  return timeFromDate(date);
}

function dateToWeekDay(
  date: Date,
  weekStart: Date,
  weekStartDay: WeekDayIntegers,
): WeekDayIntegers {
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((date.getTime() - weekStart.getTime()) / dayMs);
  return ((((weekStartDay + diffDays) % 7) + 7) % 7) as WeekDayIntegers;
}

function isSameDayOrMidnightEnd(start: Date, end: Date): boolean {
  if (start.toDateString() === end.toDateString()) return true;
  const nextMidnight = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return end.getTime() === nextMidnight.getTime();
}

function expandRecordToBlocks(record: TimeWindowRecord): VisualBlock[] {
  const hasMultiple = record.days.length > 1;
  return record.days.map((day) => ({
    key: `${record.id}-${day}`,
    windowId: record.id,
    day,
    startTime: record.startTime,
    endTime: record.endTime,
    categoryId: record.categoryId,
    recordHasMultipleDays: hasMultiple,
  }));
}

function blockToDates(
  block: { day: WeekDayIntegers; startTime: string; endTime: string },
  weekStart: Date,
  weekStartDay: WeekDayIntegers,
): { start: Date; end: Date } {
  const offset = (block.day - weekStartDay + 7) % 7;
  const baseDate = shiftDate(weekStart, offset);
  const start = setTimeOnDate(baseDate, block.startTime);
  const end =
    block.endTime === "23:59"
      ? new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate() + 1,
          0,
          0,
          0,
          0,
        )
      : setTimeOnDate(baseDate, block.endTime);
  return { start, end };
}

interface CategoryPickerProps {
  tree: CategoryNode[];
  currentCategoryId: string | null;
  onAssign: (categoryId: string) => void;
  onUnassign: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function CategoryPicker({
  tree,
  currentCategoryId,
  onAssign,
  onUnassign,
  onDelete,
  onClose,
}: CategoryPickerProps) {
  const renderNode = (node: CategoryNode, depth: number) => (
    <div key={node.id}>
      <button
        type="button"
        onClick={() => onAssign(node.id)}
        className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 flex items-center gap-2 ${
          currentCategoryId === node.id ? "bg-blue-50 font-medium" : ""
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.color && (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: node.color }}
          />
        )}
        {node.icon && <span className="text-sm">{node.icon}</span>}
        <span className="truncate">{node.name}</span>
      </button>
      {node.children.length > 0 && (
        <div>
          {node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-64 rounded-md border bg-white shadow-lg p-2 space-y-1">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Assign to
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close picker"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {tree.length === 0 ? (
          <div className="px-2 py-3 text-sm text-gray-500">
            No categories yet
          </div>
        ) : (
          tree.map((node) => renderNode(node, 0))
        )}
      </div>
      <div className="border-t pt-1 space-y-0.5">
        {currentCategoryId !== null && (
          <button
            type="button"
            onClick={onUnassign}
            className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 text-gray-700"
          >
            Unassign
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-red-50 text-red-600"
        >
          Delete window
        </button>
      </div>
    </div>
  );
}

export function TimeWindowPlacementModal({
  open,
  onOpenChange,
}: TimeWindowPlacementModalProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const weekStartDay = WEEK_START_DAY;
  const [categories, setCategories] = useState<Category[]>([]);
  const [windows, setWindows] = useState<TimeWindowRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<{
    windowId: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setPicker(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      categoryActions.fetchCategories(),
      timeWindowActions.fetchAllTimeWindows(),
    ])
      .then(([cats, wins]) => {
        setCategories(cats);
        setWindows(wins);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load data");
      })
      .finally(() => setLoading(false));
  }, [open]);

  const categoryTree = useMemo(
    () => buildCategoryTree(categories),
    [categories],
  );

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const weekStart = useMemo(
    () => getWeekFirstDate(weekStartDay, REFERENCE_WEEK_DATE),
    [weekStartDay],
  );

  const visualBlocks = useMemo(
    () => windows.flatMap(expandRecordToBlocks),
    [windows],
  );

  const events: EventInput[] = useMemo(() => {
    return visualBlocks.map((block) => {
      const cat = block.categoryId
        ? categoryById.get(block.categoryId)
        : null;
      const color = cat?.color || UNASSIGNED_COLOR;
      const title = cat ? cat.name : "Unassigned";
      const { start, end } = blockToDates(block, weekStart, weekStartDay);
      return {
        id: block.key,
        title,
        start,
        end,
        backgroundColor: color,
        borderColor: color,
        textColor: "#ffffff",
        editable: true,
        classNames: block.categoryId
          ? ["category-window-assigned"]
          : ["category-window-unassigned"],
        extendedProps: {
          windowId: block.windowId,
          recordHasMultipleDays: block.recordHasMultipleDays,
          categoryId: block.categoryId,
        },
      };
    });
  }, [visualBlocks, categoryById, weekStart, weekStartDay]);

  const refreshWindows = async () => {
    try {
      const wins = await timeWindowActions.fetchAllTimeWindows();
      setWindows(wins);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reload windows");
    }
  };

  const handleSelect = async (selectInfo: DateSelectArg) => {
    const { start, end } = selectInfo;
    if (!isSameDayOrMidnightEnd(start, end)) {
      calendarRef.current?.getApi().unselect();
      return;
    }
    const day = dateToWeekDay(start, weekStart, weekStartDay);
    const startTime = timeFromDate(start);
    const endTime = endTimeFromDate(end);

    calendarRef.current?.getApi().unselect();
    try {
      const created = await timeWindowActions.createTimeWindow({
        days: [day],
        startTime,
        endTime,
        categoryId: null,
      });
      setWindows((prev) => [...prev, created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create window");
    }
  };

  // Drop/resize of a record's visual block. When the record has only one day,
  // it's a straight update. When it has multiple days, the block is split out:
  // delete the original multi-day record and recreate it as one record per day,
  // with the moved day reflecting the new times.
  const handleBlockEdit = async (
    eventApi: { id: string; start: Date | null; end: Date | null; extendedProps: Record<string, unknown> },
  ) => {
    if (!eventApi.start || !eventApi.end) return;
    const { windowId, recordHasMultipleDays, categoryId } =
      eventApi.extendedProps as {
        windowId: string;
        recordHasMultipleDays: boolean;
        categoryId: string | null;
      };
    const newDay = dateToWeekDay(eventApi.start, weekStart, weekStartDay);
    const newStartTime = timeFromDate(eventApi.start);
    const newEndTime = endTimeFromDate(eventApi.end);
    const movedKeyDay = Number(eventApi.id.split("-").pop()) as WeekDayIntegers;

    const sourceRecord = windows.find((w) => w.id === windowId);
    if (!sourceRecord) return;

    try {
      if (!recordHasMultipleDays) {
        const updated = await timeWindowActions.updateTimeWindow(windowId, {
          days: [newDay],
          startTime: newStartTime,
          endTime: newEndTime,
        });
        setWindows((prev) =>
          prev.map((w) => (w.id === windowId ? updated : w)),
        );
        return;
      }

      // Split: delete original, recreate one record per day.
      await timeWindowActions.deleteTimeWindow(windowId);
      const otherDays = sourceRecord.days.filter((d) => d !== movedKeyDay);
      const newRecords: TimeWindowRecord[] = [];
      for (const d of otherDays) {
        const rec = await timeWindowActions.createTimeWindow({
          days: [d],
          startTime: sourceRecord.startTime,
          endTime: sourceRecord.endTime,
          categoryId,
        });
        newRecords.push(rec);
      }
      const movedRecord = await timeWindowActions.createTimeWindow({
        days: [newDay],
        startTime: newStartTime,
        endTime: newEndTime,
        categoryId,
      });
      newRecords.push(movedRecord);
      setWindows((prev) => [
        ...prev.filter((w) => w.id !== windowId),
        ...newRecords,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update window");
      await refreshWindows();
    }
  };

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    if (!isSameDayOrMidnightEnd(dropInfo.event.start!, dropInfo.event.end!)) {
      dropInfo.revert();
      return;
    }
    await handleBlockEdit({
      id: dropInfo.event.id,
      start: dropInfo.event.start,
      end: dropInfo.event.end,
      extendedProps: dropInfo.event.extendedProps,
    });
  };

  const handleEventResize = async (resizeInfo: EventResizeDoneArg) => {
    if (
      !isSameDayOrMidnightEnd(
        resizeInfo.event.start!,
        resizeInfo.event.end!,
      )
    ) {
      resizeInfo.revert();
      return;
    }
    await handleBlockEdit({
      id: resizeInfo.event.id,
      start: resizeInfo.event.start,
      end: resizeInfo.event.end,
      extendedProps: resizeInfo.event.extendedProps,
    });
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const { windowId } = clickInfo.event.extendedProps as {
      windowId: string;
    };
    const rect = clickInfo.el.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    const x = rect.right - (containerRect?.left ?? 0);
    const y = rect.top - (containerRect?.top ?? 0);
    setPicker({ windowId, x, y });
  };

  const handlePickerAssign = async (categoryId: string) => {
    if (!picker) return;
    try {
      const updated = await timeWindowActions.updateTimeWindow(
        picker.windowId,
        { categoryId },
      );
      setWindows((prev) =>
        prev.map((w) => (w.id === picker.windowId ? updated : w)),
      );
      setPicker(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign category");
    }
  };

  const handlePickerUnassign = async () => {
    if (!picker) return;
    try {
      const updated = await timeWindowActions.updateTimeWindow(
        picker.windowId,
        { categoryId: null },
      );
      setWindows((prev) =>
        prev.map((w) => (w.id === picker.windowId ? updated : w)),
      );
      setPicker(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unassign");
    }
  };

  const handlePickerDelete = async () => {
    if (!picker) return;
    try {
      await timeWindowActions.deleteTimeWindow(picker.windowId);
      setWindows((prev) => prev.filter((w) => w.id !== picker.windowId));
      setPicker(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete window");
    }
  };

  const currentPickerCategoryId = useMemo(() => {
    if (!picker) return null;
    const rec = windows.find((w) => w.id === picker.windowId);
    return rec?.categoryId ?? null;
  }, [picker, windows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] h-[92vh] flex flex-col overflow-hidden">
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .category-window-unassigned {
                background-image: repeating-linear-gradient(
                  45deg,
                  rgba(255,255,255,0.2),
                  rgba(255,255,255,0.2) 6px,
                  transparent 6px,
                  transparent 12px
                );
              }
            `,
          }}
        />
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="w-5 h-5" />
            Configure Time Windows
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Drag on the grid to place a window, then click it to assign a
            category. Unassigned windows persist until you assign or delete
            them.
          </p>
        </DialogHeader>

        {error && (
          <div className="mt-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start justify-between gap-2">
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-destructive/60 hover:text-destructive"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div
          ref={containerRef}
          className="relative flex-1 min-h-0 mt-3 border rounded-md overflow-hidden"
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Loading…
            </div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              initialDate={REFERENCE_WEEK_DATE}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              events={events}
              initialView="timeGridWeek"
              firstDay={weekStartDay}
              snapDuration="00:05:00"
              slotDuration="00:30:00"
              height="100%"
              headerToolbar={{ start: "", center: "", end: "" }}
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
              eventOverlap={false}
              selectable={true}
              selectMirror={true}
              selectOverlap={false}
              selectAllow={(info) =>
                isSameDayOrMidnightEnd(info.start, info.end)
              }
              eventAllow={(info) =>
                info.start && info.end
                  ? isSameDayOrMidnightEnd(info.start, info.end)
                  : false
              }
              select={handleSelect}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              eventClick={handleEventClick}
              allDaySlot={false}
              dayHeaderFormat={{ weekday: "short" }}
              eventContent={({ event, timeText }) => {
                const bg = event.backgroundColor || UNASSIGNED_COLOR;
                const isUnassigned =
                  (event.classNames as string[] | undefined)?.includes(
                    "category-window-unassigned",
                  ) ?? false;
                return (
                  <div
                    className="h-full w-full px-1.5 py-1 text-white text-[11px] leading-tight overflow-hidden rounded-sm"
                    style={{
                      backgroundColor: bg,
                      backgroundImage: isUnassigned
                        ? "repeating-linear-gradient(45deg, rgba(255,255,255,0.22), rgba(255,255,255,0.22) 6px, transparent 6px, transparent 12px)"
                        : undefined,
                    }}
                  >
                    <div className="font-medium truncate">{event.title}</div>
                    {timeText && (
                      <div className="opacity-90 truncate">{timeText}</div>
                    )}
                  </div>
                );
              }}
            />
          )}

          {picker && (
            <div
              className="absolute z-50"
              style={{ left: picker.x + 4, top: picker.y }}
            >
              <CategoryPicker
                tree={categoryTree}
                currentCategoryId={currentPickerCategoryId}
                onAssign={handlePickerAssign}
                onUnassign={handlePickerUnassign}
                onDelete={handlePickerDelete}
                onClose={() => setPicker(null)}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end mt-3 flex-shrink-0">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
