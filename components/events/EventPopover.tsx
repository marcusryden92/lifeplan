import { X, Pencil, Trash2, Copy, Check, Clock } from "lucide-react";
import { createPortal } from "react-dom";
import EventColorPicker from "./EventColorPicker/EventColorPicker";
import { EventImpl } from "@fullcalendar/core/internal";
import usePopoverPosition from "@/hooks/usePopoverPosition";
import useClickOutside from "@/hooks/useClickOutside";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts";
import useTitleEditor from "@/hooks/useTitleEditor";
import { handleEventCopy } from "@/utils/calendarEventHandlers";
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { LocationSelector } from "@/components/locations/LocationSelector";
import {
  assignLocationToPlanner,
  setUseParentLocation,
} from "@/actions/locations";
import { formatTime } from "@/utils/calendarUtils";
import { PlannerType } from "@/types/prisma";
import { vars } from "@/lib/theme";

interface EventPopoverProps {
  event: EventImpl;
  eventRect: DOMRect;
  startTime: Date;
  endTime: Date;
  isCompleted: boolean;
  displayPostponeButton: boolean;
  onClose: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onPostpone: () => void;
  setShowPopover: React.Dispatch<React.SetStateAction<boolean>>;
}

const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT = 340;

const EventPopover: React.FC<EventPopoverProps> = ({
  event,
  eventRect,
  startTime,
  endTime,
  isCompleted,
  displayPostponeButton,
  onClose,
  onDelete,
  onComplete,
  onPostpone,
  setShowPopover,
}) => {
  const { updateAll, planner, updatePlannerArray, inheritedLocationMap } =
    useCalendarProvider();

  const plannerItem = useMemo(
    () => planner.find((p) => p.id === event.id),
    [planner, event.id],
  );

  const inheritedInfo = plannerItem
    ? inheritedLocationMap.get(plannerItem.id)
    : undefined;
  const categoryHasLocation = !!inheritedInfo;

  const [locationOverrideEnabled, setLocationOverrideEnabled] = useState(
    () => !categoryHasLocation || !plannerItem?.useParentLocation,
  );

  useEffect(() => {
    setLocationOverrideEnabled(
      !categoryHasLocation || !plannerItem?.useParentLocation,
    );
  }, [categoryHasLocation, plannerItem?.useParentLocation]);

  const handleLocationChange = async (locationId: string | null) => {
    updatePlannerArray((prev) =>
      prev.map((p) =>
        p.id === event.id ? { ...p, locationId: locationId } : p,
      ),
    );
    try {
      await assignLocationToPlanner(event.id, locationId);
    } catch (error) {
      console.error("Failed to update location:", error);
    }
  };

  const handleToggleLocationOverride = useCallback(async () => {
    if (!plannerItem || !categoryHasLocation) return;

    const newOverrideEnabled = !locationOverrideEnabled;
    const newUseParent = !newOverrideEnabled;
    updatePlannerArray((prev) =>
      prev.map((p) =>
        p.id === plannerItem.id ? { ...p, useParentLocation: newUseParent } : p,
      ),
    );
    setLocationOverrideEnabled(newOverrideEnabled);
    try {
      await setUseParentLocation(plannerItem.id, newUseParent);
    } catch (error) {
      console.error("Failed to toggle location override:", error);
    }
  }, [
    plannerItem,
    categoryHasLocation,
    locationOverrideEnabled,
    updatePlannerArray,
  ]);

  const { position, isPositioned, isDragging, popoverRef, handleMouseDown } =
    usePopoverPosition({
      eventRect,
      dimensions: { width: POPOVER_WIDTH, height: POPOVER_HEIGHT },
      padding: 16,
    });

  const {
    isEditing,
    title,
    setTitle,
    inputRef,
    startEditing,
    handleSave,
    handleCancel,
    handleKeyDown,
    handleBlur,
  } = useTitleEditor({
    event: event,
  });

  useClickOutside({
    ref: popoverRef,
    onClickOutside: () => {
      if (isEditing) {
        handleSave();
      }
      onClose();
    },
  });

  useKeyboardShortcuts({
    shortcuts: {
      Escape: isEditing ? handleCancel : onClose,
    },
  });

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (!isEditing) {
      handleMouseDown(e);
    }
  };

  const onCopy = () => {
    setShowPopover(false);
    handleEventCopy(event, updateAll);
  };

  const showStatusActions =
    !event.extendedProps.isTemplateItem &&
    (event.extendedProps.plannerType === PlannerType.goal ||
      event.extendedProps.plannerType === PlannerType.task);

  return createPortal(
    <div
      ref={popoverRef}
        style={{
          position: "fixed",
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${POPOVER_WIDTH}px`,
          maxWidth: "calc(100vw - 20px)",
          maxHeight: "calc(100vh - 20px)",
          zIndex: 50,
          background: vars.glass.bgDeep,
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          border: `1px solid ${vars.glass.stroke}`,
          borderRadius: 18,
          boxShadow: vars.shadow.panel,
          overflow: "hidden",
          fontFamily: vars.font.ui,
          color: vars.ink,
          visibility: isPositioned ? "visible" : "hidden",
          cursor: isDragging ? "grabbing" : "auto",
        }}
        onMouseDown={handleHeaderMouseDown}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "12px 14px",
            borderBottom: `1px solid ${vars.rule}`,
            cursor: isDragging ? "grabbing" : "grab",
          }}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                fontFamily: vars.font.display,
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: vars.ink,
                background: vars.glass.bgSoft,
                border: `1px solid ${vars.rule}`,
                borderRadius: 6,
                padding: "4px 8px",
                outline: "none",
              }}
            />
          ) : (
            <div
              onClick={startEditing}
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "text",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontFamily: vars.font.display,
                  fontSize: 17,
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  color: vars.ink,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {title}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing();
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 4,
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: vars.muted,
                  cursor: "pointer",
                }}
                aria-label="Edit title"
              >
                <Pencil size={14} strokeWidth={2} />
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 4,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: vars.muted,
              cursor: "pointer",
              flexShrink: 0,
            }}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: "14px 16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
              fontSize: 12.5,
              color: vars.inkSoft,
              fontFamily: vars.font.ui,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Clock size={13} strokeWidth={2} aria-hidden style={{ color: vars.muted }} />
            <span>
              {formatTime(startTime)} – {formatTime(endTime)}
            </span>
          </div>

          {plannerItem && (
            <div style={{ marginBottom: 14 }}>
              <LocationSelector
                value={plannerItem.locationId ?? null}
                onChange={handleLocationChange}
                isOverridden={locationOverrideEnabled}
                onToggleOverride={
                  inheritedInfo ? handleToggleLocationOverride : undefined
                }
                inheritedLocationName={inheritedInfo?.locationName}
                inheritedFromLabel={inheritedInfo?.fromLabel}
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <EventColorPicker taskId={event.id} />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {event.extendedProps.plannerType !== PlannerType.task &&
                event.extendedProps.plannerType !== PlannerType.goal && (
                  <PopoverAction onClick={onCopy} icon={<Copy size={13} strokeWidth={2} />} label="Duplicate" />
                )}
              <PopoverAction
                onClick={onDelete}
                icon={<Trash2 size={13} strokeWidth={2} />}
                label="Delete"
              />
            </div>

            {showStatusActions && (
              <div
                style={{
                  paddingTop: 10,
                  borderTop: `1px solid ${vars.rule}`,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <PopoverAction
                  onClick={onComplete}
                  icon={
                    <Check
                      size={13}
                      strokeWidth={2.2}
                      style={{
                        color: isCompleted ? vars.accent.done : vars.muted,
                      }}
                    />
                  }
                  label={isCompleted ? "Completed" : "Mark complete"}
                />
                {displayPostponeButton && (
                  <PopoverAction
                    onClick={onPostpone}
                    icon={<Clock size={13} strokeWidth={2} />}
                    label="Postpone"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>,
    document.body,
  );
};

function PopoverAction({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        border: `1px solid ${vars.glass.stroke}`,
        background: vars.glass.bgDeep,
        color: vars.ink,
        fontFamily: vars.font.ui,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      <span style={{ display: "inline-flex", color: vars.muted }}>{icon}</span>
      {label}
    </button>
  );
}

export default EventPopover;
