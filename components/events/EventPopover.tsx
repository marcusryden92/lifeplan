"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  GripVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { EventImpl } from "@fullcalendar/core/internal";
import useTitleEditor from "@/hooks/useTitleEditor";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { PopoverLocationPicker } from "./PopoverLocationPicker";
import { PopoverColorPicker } from "./PopoverColorPicker";
import { handleEventCopy } from "@/utils/calendarEventHandlers";
import {
  assignLocationToPlanner,
  setUseParentLocation,
} from "@/actions/locations";
import { formatTime } from "@/utils/calendarUtils";
import { PlannerType } from "@/types/prisma";
import { calendarColors } from "@/data/calendarColors";
import { getCompleteTaskTreeIds } from "@/utils/goalPageHandlers";
import { CategoryBadge, TypeBadge } from "@/components/ui";
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

const POPOVER_WIDTH = 340;
const POPOVER_HEIGHT = 380;

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
  const router = useRouter();
  const {
    updateAll,
    planner,
    calendar,
    categories,
    updatePlannerArray,
    inheritedLocationMap,
  } = useCalendarProvider();

  const currentColor =
    (planner.find((p) => p.id === event.id)?.color as string | undefined) ??
    calendarColors[0];

  const applyColor = (color: string) => {
    const tree = getCompleteTaskTreeIds(planner, event.id);
    const newPlanner = planner.map((item) =>
      tree.includes(item.id) ? { ...item, color } : item,
    );
    const newCalendar = calendar.map((item) =>
      tree.includes(item.id) ? { ...item, backgroundColor: color } : item,
    );
    updateAll(newPlanner, newCalendar);
  };

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
  } = useTitleEditor({ event });

  const onCopy = () => {
    setShowPopover(false);
    handleEventCopy(event, updateAll);
  };

  const openFullEditor = () => {
    setShowPopover(false);
    router.push(`/items/${event.id}`);
  };

  const plannerType = event.extendedProps.plannerType as
    | PlannerType
    | undefined;
  const isTemplate = !!event.extendedProps.isTemplateItem;
  const showStatusActions =
    !isTemplate &&
    (plannerType === PlannerType.task || plannerType === PlannerType.goal);

  const durationMinutes = Math.max(
    0,
    Math.round((endTime.getTime() - startTime.getTime()) / 60000),
  );
  const durationLabel = (() => {
    if (durationMinutes < 60) return `${durationMinutes}m`;
    const h = Math.floor(durationMinutes / 60);
    const m = durationMinutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  })();

  const typeLabel = (plannerType ?? "task").toString();

  // Resolve the category chain (root → leaf) for the item, so nested category
  // breadcrumbs render in the header. Walks the planner-parent chain first to
  // find the effective categoryId (subtasks/sub-goals inherit from their goal
  // ancestor), then walks the category-parent chain to build the breadcrumb.
  const categoryChain = useMemo(() => {
    let effectiveCategoryId: string | null = null;
    const seenPlanners = new Set<string>();
    let cursor: typeof plannerItem = plannerItem;
    while (cursor && !seenPlanners.has(cursor.id)) {
      seenPlanners.add(cursor.id);
      if (cursor.categoryId) {
        effectiveCategoryId = cursor.categoryId;
        break;
      }
      if (!cursor.parentId) break;
      const next = planner.find((p) => p.id === cursor!.parentId);
      cursor = next;
    }
    if (!effectiveCategoryId) return [];

    const chain: { id: string; name: string; color?: string | null }[] = [];
    const seenCats = new Set<string>();
    let curId: string | null | undefined = effectiveCategoryId;
    while (curId && !seenCats.has(curId)) {
      seenCats.add(curId);
      const cat = categories.find((c) => c.id === curId);
      if (!cat) break;
      chain.unshift({ id: cat.id, name: cat.name, color: cat.color });
      curId = cat.parentId ?? null;
    }
    return chain;
  }, [plannerItem, planner, categories]);

  const leafCategory = categoryChain[categoryChain.length - 1];

  return (
    <CalendarPopover
      anchorRect={eventRect}
      width={POPOVER_WIDTH}
      height={POPOVER_HEIGHT}
      title={event.title || "Event details"}
      onClose={() => {
        if (isEditing) handleSave();
        onClose();
      }}
      onEscape={isEditing ? handleCancel : onClose}
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
              <TypeBadge size="sm">{typeLabel}</TypeBadge>
              {leafCategory && (
                <CategoryBadge
                  size="sm"
                  color={leafCategory.color ?? vars.muted}
                >
                  {leafCategory.name}
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
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={titleInput}
              />
            ) : (
              <>
                <h3
                  className={titleStatic}
                  onClick={startEditing}
                  title="Click to rename"
                >
                  {title}
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
                {format(startTime, "EEE MMM d")} · {formatTime(startTime)} –{" "}
                {formatTime(endTime)} · {durationLabel}
              </span>
            </div>

            {plannerItem && (
              <PopoverLocationPicker
                value={plannerItem.locationId ?? null}
                onChange={handleLocationChange}
                isOverridden={locationOverrideEnabled}
                onToggleOverride={
                  inheritedInfo ? handleToggleLocationOverride : undefined
                }
                inheritedLocationName={inheritedInfo?.locationName}
                inheritedFromLabel={inheritedInfo?.fromLabel}
              />
            )}

            <PopoverColorPicker
              currentColor={currentColor}
              onChange={applyColor}
            />

            {showStatusActions && (
              <div style={{ display: "flex", gap: 6 }}>
                <PrimaryAction
                  onClick={onComplete}
                  filled={!isCompleted}
                  icon={<Check size={13} strokeWidth={2.2} />}
                  label={isCompleted ? "Completed" : "Complete"}
                />
                {displayPostponeButton && (
                  <PrimaryAction
                    onClick={onPostpone}
                    icon={<Clock size={13} strokeWidth={2} />}
                    label="Postpone"
                  />
                )}
              </div>
            )}

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
                onClick={openFullEditor}
                icon={<ArrowUpRight size={13} strokeWidth={2} />}
                label="Open full editor"
              />
              {plannerType !== PlannerType.task &&
                plannerType !== PlannerType.goal && (
                  <PopAction
                    onClick={onCopy}
                    icon={<Copy size={13} strokeWidth={2} />}
                    label="Duplicate"
                  />
                )}
              <PopAction
                onClick={onDelete}
                icon={<Trash2 size={13} strokeWidth={2} />}
                label="Delete"
                danger
              />
            </div>
          </div>
        </>
      )}
    </CalendarPopover>
  );
};

function PrimaryAction({
  onClick,
  filled,
  icon,
  label,
  disabled,
}: {
  onClick: () => void;
  filled?: boolean;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "8px 12px",
        borderRadius: 999,
        border: `1px solid ${filled ? vars.ink : vars.glass.stroke}`,
        background: filled ? vars.ink : vars.glass.bgDeep,
        color: filled ? vars.paper : vars.ink,
        fontFamily: vars.font.ui,
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

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

export default EventPopover;
