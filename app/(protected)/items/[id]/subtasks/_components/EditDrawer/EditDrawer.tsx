"use client";

import { space } from "@/lib/theme";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { X, Trash2, Copy, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { Button, Caption, Input, Switch } from "@/components/ui";
import {
  SplittingFields,
  DEFAULT_SPLITTING_SETTINGS,
} from "@/components/tasks/SplittingFields";
import {
  parseTaskSplitting,
  serializeTaskSplitting,
  splitCompletedMinutes,
  type TaskSplittingSettings,
} from "@/utils/taskSplitting";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { useDraggableContext } from "@/components/draggable/DraggableContext";
import { useFlashBoolean } from "@/hooks/useFlashAnimation";
import { assignLocationToPlanner } from "@/actions/locations";
import { deleteGoal, duplicateSubtree } from "@/utils/goalPageHandlers";
import { NEW_SUBTASK_TITLE } from "@/components/tasks/task-item-subcomponents/TaskHeader";
import {
  setSubtaskCompletedAt,
  toggleSubtaskCompletion,
} from "@/utils/goal-handlers/subtaskCompletion";
import { getRootParentId, getSubtasksById } from "@/utils/goalPageHandlers";
import { Check } from "lucide-react";
import {
  Combobox,
  ConfirmModal,
  DateTimePicker,
  DurationField,
} from "@/components/ui";
import { formatDatetimeLocal, parseDatetimeLocal } from "@/utils/datetime";
import { SHAKE_DURATION_MS } from "../../../_constants";

import {
  drawer,
  drawerHeader,
  drawerHeaderLabel,
  drawerClose,
  drawerBody,
  drawerTitleInput,
  fieldStack,
  fieldLabel,
  splitToggleRow,
  splitHint,
  dateInputFaded,
  completeSection,
  completeHeader,
  completeCheckbox,
  drawerFooter,
  footerActionGroup,
} from "./EditDrawer.css";

export function EditDrawer() {
  const { planner, updatePlannerArray, updateAll, weekStartDay } =
    useCalendarProvider();
  const { focusedTask, setFocusedTask } = useDraggableContext();
  const locations = useSelector(
    (state: RootState) => state.schedulingSettings.locations,
  );

  const task = useMemo(
    () => (focusedTask ? planner.find((p) => p.id === focusedTask) : undefined),
    [planner, focusedTask],
  );

  const isLeaf = useMemo(
    () => (task ? getSubtasksById(planner, task.id).length === 0 : false),
    [planner, task],
  );

  // Gate completion on the root item being ready (mirrors TaskItem.tsx).
  const completionLocked = useMemo(() => {
    if (!task) return false;
    const rootId = getRootParentId(planner, task.id);
    if (!rootId) return false;
    const root = planner.find((p) => p.id === rootId);
    return root ? !root.isReady : false;
  }, [planner, task]);

  const [titleDraft, setTitleDraft] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleDraft(task?.title ?? "");
  }, [task?.id, task?.title]);

  // Escape closes the drawer. defaultPrevented check yields to any open Radix
  // Dialog above (the delete confirm) — Radix's dismissable-layer calls
  // preventDefault on Escape when it consumes it.
  useEffect(() => {
    if (!task) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === "Escape") setFocusedTask(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [task, setFocusedTask]);

  // Auto-focus + select the title input for freshly created subtasks.
  useEffect(() => {
    if (task?.title === NEW_SUBTASK_TITLE && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [task?.id, task?.title]);

  const [shakeLocked, flashShake] = useFlashBoolean(SHAKE_DURATION_MS);

  if (!task) return null;

  const close = () => setFocusedTask(null);

  const splitSettings = parseTaskSplitting(task.splitting);
  const splitCompleted = splitCompletedMinutes(task);

  const commitTitle = () => {
    const t = titleDraft.trim();
    if (!t || t === task.title) return;
    updatePlannerArray((prev) =>
      prev.map((p) =>
        p.id === task.id
          ? { ...p, title: t, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
  };

  const onTitleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
    if (e.key === "Escape") {
      setTitleDraft(task.title);
      e.currentTarget.blur();
    }
  };

  const setDuration = (next: number) => {
    updatePlannerArray((prev) =>
      prev.map((p) =>
        p.id === task.id
          ? { ...p, duration: next, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
  };

  const applySplitting = (next: TaskSplittingSettings | null) => {
    updatePlannerArray((prev) =>
      prev.map((p) =>
        p.id === task.id
          ? {
              ...p,
              splitting: next ? serializeTaskSplitting(next) : null,
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    );
  };

  const setDeadline = (iso: string | null) => {
    updatePlannerArray((prev) =>
      prev.map((p) =>
        p.id === task.id
          ? {
              ...p,
              deadline: iso,
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    );
  };

  const onDateInput = (value: string) =>
    setDeadline(parseDatetimeLocal(value) || null);

  const onLocationChange = async (locationId: string | null) => {
    await assignLocationToPlanner(task.id, locationId);
    updatePlannerArray((prev) =>
      prev.map((p) => (p.id === task.id ? { ...p, locationId } : p)),
    );
  };

  const dateValue = formatDatetimeLocal(task.deadline);
  const completedValue = formatDatetimeLocal(task.completedEndTime);

  const onCompletedAtChange = (value: string) => {
    if (completionLocked) {
      flashShake();
      return;
    }
    const iso = parseDatetimeLocal(value) || null;
    updatePlannerArray((prev) => setSubtaskCompletedAt(prev, task.id, iso));
  };

  const toggleCompletion = () => {
    if (completionLocked) {
      flashShake();
      return;
    }
    updatePlannerArray((prev) => toggleSubtaskCompletion(prev, task.id));
  };

  const isCompleted = !!task.completedEndTime;

  const locationOptions = [
    { value: null, label: <Caption>Anywhere</Caption> },
    ...locations.map((l) => ({
      value: l.id,
      label: (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: space["2"],
          }}
        >
          <MapPin size={12} strokeWidth={2} />
          <span>{l.name}</span>
        </span>
      ),
    })),
  ];

  const currentLocation = locations.find((l) => l.id === task.locationId);

  const handleDelete = () => {
    deleteGoal({ updateAll, taskId: task.id });
    setShowDeleteConfirm(false);
    setFocusedTask(null);
  };

  const handleDuplicate = () => {
    const result = duplicateSubtree({ planner, taskId: task.id });
    if (!result) return;
    updatePlannerArray(result.newPlanner);
    setFocusedTask(result.newRootId);
  };

  return (
    <aside className={drawer}>
      <div className={drawerHeader}>
        <span className={drawerHeaderLabel}>Edit subtask</span>
        <button
          type="button"
          className={drawerClose}
          onClick={close}
          aria-label="Close"
        >
          <X size={14} strokeWidth={2.2} />
        </button>
      </div>

      <div className={drawerBody}>
        <Input
          ref={titleInputRef}
          variant="titleInline"
          className={drawerTitleInput}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={onTitleKey}
          placeholder="Subtask title"
        />

        {isLeaf && (
          <div className={completeSection}>
            <div className={completeHeader}>
              <button
                type="button"
                className={completeCheckbox}
                data-completed={isCompleted ? "true" : "false"}
                data-locked={completionLocked ? "true" : "false"}
                data-shake={shakeLocked ? "true" : "false"}
                onClick={toggleCompletion}
                aria-pressed={isCompleted}
                aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
                title={
                  completionLocked
                    ? "Mark the goal ready before completing subtasks"
                    : undefined
                }
              >
                {isCompleted && <Check size={12} strokeWidth={3} />}
              </button>
              <span className={fieldLabel}>Completed at</span>
            </div>
            <div
              className={isCompleted && !completionLocked ? "" : dateInputFaded}
              title={
                completionLocked
                  ? "Mark the goal ready before completing subtasks"
                  : undefined
              }
            >
              <DateTimePicker
                value={completedValue}
                onChange={onCompletedAtChange}
                weekStartsOn={weekStartDay}
                clearable={isCompleted && !completionLocked}
                ariaLabel="Completed at"
              />
            </div>
          </div>
        )}

        <div className={fieldStack}>
          <span className={fieldLabel}>Duration</span>
          <DurationField
            minutes={task.duration ?? 0}
            ariaLabel="Duration"
            onCommit={setDuration}
          />
        </div>

        {isLeaf && task.plannerType !== "plan" && (
          <div className={fieldStack}>
            <span className={fieldLabel}>Split into chunks</span>
            <div className={splitToggleRow}>
              <Switch
                checked={splitSettings !== null}
                onCheckedChange={(checked) =>
                  applySplitting(checked ? DEFAULT_SPLITTING_SETTINGS : null)
                }
                aria-label="Split into chunks"
              />
              {!splitSettings && (
                <span className={splitHint}>
                  Schedule as flexible chunks instead of one block
                </span>
              )}
            </div>
            {splitSettings && (
              <SplittingFields
                settings={splitSettings}
                duration={task.duration ?? 0}
                completed={splitCompleted}
                onChange={applySplitting}
              />
            )}
          </div>
        )}

        <div className={fieldStack}>
          <span className={fieldLabel}>Location</span>
          <Combobox
            value={task.locationId ?? null}
            options={locationOptions}
            onChange={onLocationChange}
            renderValue={() =>
              currentLocation ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: space["1.5"],
                  }}
                >
                  <MapPin size={12} strokeWidth={2} />
                  {currentLocation.name}
                </span>
              ) : (
                <Caption>Anywhere</Caption>
              )
            }
            ariaLabel="Location"
          />
        </div>

        <div className={fieldStack}>
          <span className={fieldLabel}>Deadline</span>
          <DateTimePicker
            value={dateValue}
            onChange={onDateInput}
            weekStartsOn={weekStartDay}
            ariaLabel="Deadline"
          />
        </div>
      </div>

      <div className={drawerFooter}>
        <div className={footerActionGroup}>
          <Button
            variant="glass"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Delete subtask"
          >
            <Trash2 size={12} strokeWidth={2.2} />
          </Button>
          <Button
            variant="glass"
            size="sm"
            onClick={handleDuplicate}
            aria-label="Duplicate subtask"
            title="Duplicate subtask"
          >
            <Copy size={12} strokeWidth={2.2} />
          </Button>
        </div>
        <Button variant="solid" size="sm" onClick={close}>
          Done
        </Button>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete subtask"
        body={
          <>
            Delete <strong>{task.title}</strong>? Any nested subtasks will also
            be removed.
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </aside>
  );
}
