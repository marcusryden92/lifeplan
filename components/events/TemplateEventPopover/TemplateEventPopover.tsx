"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Clock,
  Copy,
  GripVertical,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { EventImpl } from "@fullcalendar/core/internal";
import { useCalendarProvider } from "@/context/CalendarProvider";
import {
  Button,
  CategoryBadge,
  Input,
  TimePicker,
  TypeBadge,
} from "@/components/ui";
import {
  occurrenceKeyFromEventId,
  hasMovedException,
} from "@/utils/planRecurrence";
import { applyTemplateOccurrenceRestore } from "@/utils/calendarEventHandlers";
import { PopoverLocationPicker } from "../PopoverLocationPicker";
import { PopoverColorPicker } from "../PopoverColorPicker";
import { formatTime, timeOnDate } from "@/utils/calendarUtils";
import { calendarColors } from "@/data/calendarColors";
import { vars } from "@/lib/theme";
import { CalendarPopover } from "../CalendarPopover";
import { PopoverAction } from "../PopoverAction";
import {
  header,
  dragHandle,
  headerBadges,
  closeBtn,
  titleRow,
  titleStatic,
  titleInput,
  renamePencil,
  body,
  metaRow,
  footer,
  timeFieldsRow,
  timeField,
  timeFieldLabel,
} from "../CalendarPopover/CalendarPopover.css";
import {
  headerGrabbing,
  metaIcon,
  note,
  restoreBtn,
} from "./TemplateEventPopover.css";

interface TemplateEventPopoverProps {
  event: EventImpl;
  eventRect: DOMRect;
  startTime: Date;
  endTime: Date;
  onClose: () => void;
  onEdit: (newTitle: string) => void;
  onCopy: () => void;
  onDelete: () => void;
  onEditTimes?: (newStart: Date, newEnd: Date) => void;
}

const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT = 390;

const TemplateEventPopover: React.FC<TemplateEventPopoverProps> = ({
  event,
  eventRect,
  startTime,
  endTime,
  onClose,
  onEdit,
  onCopy,
  onDelete,
  onEditTimes,
}) => {
  const { template, updateTemplateArray } = useCalendarProvider();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState<string>(event.title || "");

  // A moved one-off occurrence's event.id is a composite `templateId|key`;
  // the template row id rides in extendedProps.eventId.
  const templateId =
    (event.extendedProps?.eventId as string | undefined) ?? event.id;

  const templateItem = useMemo(
    () => template.find((t) => t.id === templateId),
    [template, templateId],
  );

  const currentColor =
    (templateItem?.color as string | undefined) ?? calendarColors[0];

  // A moved one-off carries a composite id whose key must also still have a
  // moved exception on the row — otherwise the tile is a plain series
  // occurrence and there is nothing to restore.
  const occurrenceKeyValue = occurrenceKeyFromEventId(event.id);
  const isException =
    !!templateItem &&
    occurrenceKeyValue !== null &&
    hasMovedException(templateItem.recurrenceExceptions, occurrenceKeyValue);

  const handleRestore = () => {
    if (templateItem && occurrenceKeyValue !== null) {
      applyTemplateOccurrenceRestore(
        updateTemplateArray,
        templateItem.id,
        occurrenceKeyValue,
      );
    }
    // The one-off tile this popover is anchored to disappears on restore.
    onClose();
  };

  const applyColor = (color: string) => {
    updateTemplateArray((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, color } : t)),
    );
  };

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleLocationChange = (locationId: string | null) => {
    updateTemplateArray((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, locationId } : t)),
    );
  };

  const startEditing = () => setIsEditingTitle(true);

  const handleTitleSave = () => {
    if (onEdit && titleValue.trim() !== "") onEdit(titleValue);
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setIsEditingTitle(false);
    setTitleValue(event.title);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleTitleSave();
    else if (e.key === "Escape") handleTitleCancel();
  };

  const categoryColor = event.backgroundColor ?? vars.muted;

  return (
    <CalendarPopover
      anchorRect={eventRect}
      width={POPOVER_WIDTH}
      height={POPOVER_HEIGHT}
      title={event.title || "Template details"}
      onClose={() => {
        if (isEditingTitle) handleTitleSave();
        onClose();
      }}
      onEscape={isEditingTitle ? handleTitleCancel : onClose}
    >
      {({ startDrag, isDragging }) => (
        <>
          <div className={isDragging ? `${header} ${headerGrabbing}` : header}>
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
              <TypeBadge size="sm">template</TypeBadge>
              {(event.extendedProps.categoryName as string | undefined) && (
                <CategoryBadge size="sm" color={categoryColor}>
                  {event.extendedProps.categoryName as string}
                </CategoryBadge>
              )}
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
            {isEditingTitle ? (
              <Input
                ref={titleInputRef}
                variant="titleInline"
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className={titleInput}
              />
            ) : (
              <>
                <h3
                  className={titleStatic}
                  onClick={startEditing}
                  title="Click to rename"
                >
                  {titleValue}
                </h3>
                <button
                  type="button"
                  className={renamePencil}
                  onClick={startEditing}
                  aria-label="Rename"
                >
                  <Pencil size={14} strokeWidth={2} />
                </button>
              </>
            )}
          </div>

          <div className={body}>
            <div className={metaRow}>
              <Clock
                size={13}
                strokeWidth={2}
                aria-hidden
                className={metaIcon}
              />
              <span>
                {format(startTime, "EEE")} · {formatTime(startTime)} –{" "}
                {formatTime(endTime)}
              </span>
            </div>

            {onEditTimes && (
              <div className={timeFieldsRow}>
                <div className={timeField}>
                  <span className={timeFieldLabel}>start</span>
                  <TimePicker
                    value={format(startTime, "HH:mm")}
                    ariaLabel="Start time"
                    onChange={(next) => {
                      // The end stays fixed — a form start edit is the
                      // top-edge resize. An end at or before it wraps to the
                      // next morning.
                      const newStart = timeOnDate(startTime, next);
                      if (newStart.getTime() === startTime.getTime()) return;
                      const newEnd =
                        endTime <= newStart
                          ? new Date(endTime.getTime() + 24 * 60 * 60 * 1000)
                          : endTime;
                      onEditTimes(newStart, newEnd);
                    }}
                  />
                </div>
                <div className={timeField}>
                  <span className={timeFieldLabel}>end</span>
                  <TimePicker
                    value={format(endTime, "HH:mm")}
                    ariaLabel="End time"
                    onChange={(next) => {
                      // End at or before start wraps to the next morning.
                      let newEnd = timeOnDate(startTime, next);
                      if (newEnd <= startTime) {
                        newEnd = new Date(
                          newEnd.getTime() + 24 * 60 * 60 * 1000,
                        );
                      }
                      if (newEnd.getTime() === endTime.getTime()) return;
                      onEditTimes(startTime, newEnd);
                    }}
                  />
                </div>
              </div>
            )}

            <div className={note}>
              {isException
                ? "This occurrence was moved out of its usual slot. Other edits still apply to every occurrence."
                : "Editing applies to every occurrence of this template."}
            </div>

            {isException && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestore}
                className={restoreBtn}
              >
                <RotateCcw size={11} strokeWidth={2.2} />
                Restore to series
              </Button>
            )}

            {templateItem && (
              <PopoverLocationPicker
                value={templateItem.locationId ?? null}
                onChange={handleLocationChange}
              />
            )}

            <PopoverColorPicker
              currentColor={currentColor}
              onChange={applyColor}
            />

            <div className={footer}>
              <PopoverAction
                onClick={onCopy}
                icon={<Copy size={13} strokeWidth={2} />}
                label="Duplicate"
              />
              <PopoverAction
                onClick={onDelete}
                icon={<Trash2 size={13} strokeWidth={2} />}
                label="Delete"
                variant="danger"
              />
            </div>
          </div>
        </>
      )}
    </CalendarPopover>
  );
};

export default TemplateEventPopover;
