"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import type { RootState } from "@/redux/store";
import type { Category } from "@/types/prisma";
import { RecurrenceExceptionList } from "@/components/events/RecurrenceExceptionList";
import {
  parseRecurrenceExceptions,
  removeException,
  serializeRecurrenceExceptions,
} from "@/utils/planRecurrence";
import { orderedWeekDays } from "@/utils/calendarUtils";
import {
  overlay,
  modal,
  header,
  headerText,
  title,
  subtitle,
  closeBtn,
  columns,
  windowList,
  windowRow,
  dot,
  windowLabel,
  countBadge,
  panel,
  exceptionList,
  empty,
} from "./CategoryExceptionsModal.css";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FALLBACK_COLOR = "#9ca3af";

interface CategoryExceptionsModalProps {
  open: boolean;
  onClose: () => void;
  category: Category;
  onChangeWindowExceptions: (
    windowId: string,
    serialized: string | null,
  ) => void;
}

// Read-and-restore surface for a category's per-occurrence window exceptions:
// windows on the left, the selected window's exceptions on the right. Creating
// exceptions happens on the calendar, so this only offers Restore.
export function CategoryExceptionsModal({
  open,
  onClose,
  category,
  onChangeWindowExceptions,
}: CategoryExceptionsModalProps) {
  const weekStartDay = useSelector(
    (state: RootState) => state.schedulingSettings.weekStartDay,
  );

  const windows = useMemo(() => {
    const rank = new Map<number, number>(
      orderedWeekDays(weekStartDay).map((d, i): [number, number] => [d, i]),
    );
    return [...category.timeSlots].sort(
      (a, b) =>
        (rank.get(a.day) ?? a.day) - (rank.get(b.day) ?? b.day) ||
        a.startTime.localeCompare(b.startTime),
    );
  }, [category.timeSlots, weekStartDay]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Reset to the first window whenever the modal (re)opens or the category
  // changes underneath it.
  useEffect(() => {
    if (open) setSelectedId(null);
  }, [open, category.id]);

  const effectiveSelectedId = selectedId ?? windows[0]?.id ?? null;
  const selectedWindow =
    windows.find((w) => w.id === effectiveSelectedId) ?? null;

  const selectedExceptions = useMemo(
    () =>
      selectedWindow
        ? parseRecurrenceExceptions(selectedWindow.recurrenceExceptions)
        : [],
    [selectedWindow],
  );

  const color = category.color || FALLBACK_COLOR;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content className={modal} aria-describedby={undefined}>
          <div className={header}>
            <div className={headerText}>
              <Dialog.Title className={title}>Window exceptions</Dialog.Title>
              <span className={subtitle}>
                Skipped and moved occurrences in {category.name}. Restore one to
                return it to its regular time.
              </span>
            </div>
            <button
              type="button"
              className={closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <div className={columns}>
            <div className={windowList}>
              {windows.map((w) => {
                const count = parseRecurrenceExceptions(
                  w.recurrenceExceptions,
                ).length;
                return (
                  <button
                    key={w.id}
                    type="button"
                    className={windowRow}
                    data-active={w.id === effectiveSelectedId}
                    onClick={() => setSelectedId(w.id)}
                  >
                    <span className={dot} style={{ background: color }} />
                    <span className={windowLabel}>
                      {DAY_LABELS[w.day]} {w.startTime}–{w.endTime}
                    </span>
                    {count > 0 && <span className={countBadge}>{count}</span>}
                  </button>
                );
              })}
            </div>

            <div className={panel}>
              {selectedWindow && selectedExceptions.length > 0 ? (
                <div className={exceptionList}>
                  <RecurrenceExceptionList
                    exceptions={selectedExceptions}
                    onRestore={(key) =>
                      onChangeWindowExceptions(
                        selectedWindow.id,
                        serializeRecurrenceExceptions(
                          removeException(selectedExceptions, key),
                        ),
                      )
                    }
                    variant="card"
                  />
                </div>
              ) : (
                <div className={empty}>
                  {selectedWindow
                    ? "No exceptions on this window."
                    : "Select a window to see its exceptions."}
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
