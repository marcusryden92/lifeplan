"use client";

import React from "react";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { format } from "date-fns";
import { CalendarClock, Clock, GripVertical, Settings, X } from "lucide-react";
import { EventImpl } from "@fullcalendar/core/internal";
import { formatTime } from "@/utils/calendarUtils";
import type { AppDispatch } from "@/redux/store";
import { upsertExternalSource } from "@/redux/slices/externalCalendarSlice";
import {
  toggleExternalEventBusyException,
  updateExternalCalendarSource,
} from "@/actions/externalCalendars";
import { toggleModeException } from "@/utils/external-calendar/modeExceptions";
import { useCalendarProvider } from "@/context/CalendarProvider";
import type { RuntimeEventExtendedProps } from "@/types/ui";
import { TypeBadge, Switch } from "@/components/ui";
import { CalendarPopover } from "../CalendarPopover";
import { PopoverColorPicker } from "../PopoverColorPicker";
import {
  header,
  dragHandle,
  headerBadges,
  closeBtn,
  titleRow,
  titleStatic,
  body,
  metaRow,
} from "../CalendarPopover/CalendarPopover.css";
import {
  mutedText,
  sourceRow,
  switchRow,
  switchLabel,
  switchTitle,
  switchHint,
  footerActions,
  settingsLink,
} from "./ExternalEventPopover.css";

interface ExternalEventPopoverProps {
  event: EventImpl;
  eventRect: DOMRect;
  startTime: Date;
  endTime: Date;
  onClose: () => void;
}

const POPOVER_WIDTH = 340;
const POPOVER_HEIGHT = 300;
const FALLBACK_ACCENT = "#8b8b8b";

const ExternalEventPopover: React.FC<ExternalEventPopoverProps> = ({
  event,
  eventRect,
  startTime,
  endTime,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { updateAll, externalSources } = useCalendarProvider();

  const ext = event.extendedProps as RuntimeEventExtendedProps;
  const sourceId = ext.externalSourceId;
  const uid = ext.externalUid;
  const busy = !!ext.externalBusy;
  const allDay = !!ext.externalAllDay;
  const source = externalSources.find((s) => s.id === sourceId);
  const sourceName = source?.name ?? ext.externalSourceName ?? "Imported calendar";

  // Optimistic like the settings row: the source recolors in Redux
  // immediately (color is render-only, no regen), the server write settles
  // in the background and rolls back on failure.
  const onChangeColor = (color: string) => {
    if (!source) return;
    dispatch(upsertExternalSource({ ...source, color }));
    void updateExternalCalendarSource(source.id, { color }).then((result) => {
      dispatch(upsertExternalSource(result.success ? result.source : source));
    });
  };

  // Optimistic: the exception flips in Redux immediately (tile + engine regen
  // follow from state), the server write settles in the background and rolls
  // back on failure.
  const onToggleBusy = () => {
    if (!source || !uid) return;
    dispatch(
      upsertExternalSource({
        ...source,
        modeExceptions: toggleModeException(source.modeExceptions, uid),
      }),
    );
    updateAll();
    void toggleExternalEventBusyException(source.id, uid).then((result) => {
      if (result.success) {
        dispatch(upsertExternalSource(result.source));
      } else {
        dispatch(upsertExternalSource(source));
        updateAll();
      }
    });
  };

  return (
    <CalendarPopover
      anchorRect={eventRect}
      width={POPOVER_WIDTH}
      height={POPOVER_HEIGHT}
      title={event.title || "Imported event"}
      onClose={onClose}
    >
      {({ startDrag }) => (
        <>
          <div className={header}>
            <button
              type="button"
              className={dragHandle}
              onMouseDown={startDrag}
              aria-label="Drag to move"
              title="Drag to move"
            >
              <GripVertical size={16} strokeWidth={2} />
            </button>
            <div className={headerBadges}>
              <TypeBadge size="sm" tone="type">
                imported
              </TypeBadge>
            </div>
            <button
              type="button"
              className={closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          <div className={titleRow}>
            <h3 className={titleStatic} title={event.title}>
              {event.title || "Imported event"}
            </h3>
          </div>

          <div className={body}>
            <div className={metaRow}>
              <Clock
                size={13}
                strokeWidth={2}
                aria-hidden
                className={mutedText}
              />
              <span>
                {format(startTime, "EEE MMM d")} · {formatTime(startTime)} –{" "}
                {formatTime(endTime)}
              </span>
            </div>

            <div className={sourceRow}>
              <CalendarClock size={13} strokeWidth={2} aria-hidden />
              <span>From {sourceName}. Edits happen in the source calendar.</span>
            </div>

            {allDay ? (
              <div className={sourceRow}>
                <span>All-day events never block scheduling.</span>
              </div>
            ) : (
              <div className={switchRow}>
                <span className={switchLabel}>
                  <span className={switchTitle}>Blocks scheduling</span>
                  <span className={switchHint}>
                    {busy
                      ? "The engine keeps this time free."
                      : "Shown on the calendar only — the engine may schedule over it."}
                  </span>
                </span>
                <Switch
                  checked={busy}
                  onCheckedChange={onToggleBusy}
                  aria-label="Blocks scheduling"
                />
              </div>
            )}

            {source && (
              <div className={footerActions}>
                <PopoverColorPicker
                  currentColor={source.color ?? FALLBACK_ACCENT}
                  onChange={onChangeColor}
                />
                <Link href="/settings" className={settingsLink} onClick={onClose}>
                  <Settings size={12} strokeWidth={2} aria-hidden />
                  Calendar settings
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </CalendarPopover>
  );
};

export default ExternalEventPopover;
