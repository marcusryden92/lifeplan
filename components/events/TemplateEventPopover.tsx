"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Clock,
  Copy,
  GripVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { EventImpl } from "@fullcalendar/core/internal";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { CategoryBadge, TypeBadge } from "@/components/ui";
import { PopoverLocationPicker } from "./PopoverLocationPicker";
import { PopoverColorPicker } from "./PopoverColorPicker";
import { assignLocationToTemplate } from "@/actions/locations";
import { formatTime } from "@/utils/calendarUtils";
import { calendarColors } from "@/data/calendarColors";
import { vars } from "@/lib/theme";
import { CalendarPopover } from "./CalendarPopover";
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
} from "./CalendarPopover.css";

interface TemplateEventPopoverProps {
  event: EventImpl;
  eventRect: DOMRect;
  startTime: Date;
  endTime: Date;
  onClose: () => void;
  onEdit: (newTitle: string) => void;
  onCopy: () => void;
  onDelete: () => void;
}

const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT = 340;

const TemplateEventPopover: React.FC<TemplateEventPopoverProps> = ({
  event,
  eventRect,
  startTime,
  endTime,
  onClose,
  onEdit,
  onCopy,
  onDelete,
}) => {
  const { template, updateTemplateArray } = useCalendarProvider();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState<string>(event.title || "");

  const templateItem = useMemo(
    () => template.find((t) => t.id === event.id),
    [template, event.id],
  );

  const currentColor =
    (templateItem?.color as string | undefined) ?? calendarColors[0];

  const applyColor = (color: string) => {
    updateTemplateArray((prev) =>
      prev.map((t) => (t.id === event.id ? { ...t, color } : t)),
    );
  };

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleLocationChange = async (locationId: string | null) => {
    try {
      await assignLocationToTemplate(event.id, locationId);
      updateTemplateArray((prev) =>
        prev.map((t) =>
          t.id === event.id ? { ...t, locationId: locationId } : t,
        ),
      );
    } catch (error) {
      console.error("Failed to update template location:", error);
    }
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
          <div
            className={header}
            style={{ cursor: isDragging ? "grabbing" : "default" }}
          >
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
              <input
                ref={titleInputRef}
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
                style={{ color: vars.muted }}
              />
              <span>
                {format(startTime, "EEE")} · {formatTime(startTime)} –{" "}
                {formatTime(endTime)}
              </span>
            </div>

            <div
              style={{
                fontSize: 11.5,
                color: vars.muted,
                fontFamily: vars.font.ui,
                lineHeight: 1.45,
              }}
            >
              Editing applies to every occurrence of this template.
            </div>

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

            <div
              style={{
                paddingTop: 8,
                borderTop: `1px solid ${vars.rule}`,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <PopAction
                onClick={onCopy}
                icon={<Copy size={13} strokeWidth={2} />}
                label="Duplicate"
              />
              <PopAction
                onClick={onDelete}
                icon={<Trash2 size={13} strokeWidth={2} />}
                label="Delete all occurrences"
                danger
              />
            </div>
          </div>
        </>
      )}
    </CalendarPopover>
  );
};

function PopAction({
  onClick,
  icon,
  label,
  danger,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 8px",
        borderRadius: 8,
        border: "none",
        background: "transparent",
        color: danger ? vars.status.error : vars.ink,
        fontFamily: vars.font.ui,
        fontSize: 12.5,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          color: danger ? vars.status.error : vars.muted,
        }}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

export default TemplateEventPopover;
