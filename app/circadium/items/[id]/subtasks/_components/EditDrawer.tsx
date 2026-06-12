"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { X, Minus, Plus, Trash2, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { Button, Caption } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { useDraggableContext } from "@/components/draggable/DraggableContext";
import { assignLocationToPlanner } from "@/actions/locations";
import { deleteGoal } from "@/utils/goalPageHandlers";
import { NEW_SUBTASK_TITLE } from "@/components/tasks/task-item-subcomponents/TaskHeader";
import { LumenDropdown } from "@/app/circadium/items/[id]/_components/LumenDropdown";
import { LumenConfirmModal } from "@/app/circadium/items/[id]/_components/LumenConfirmModal";

import {
  drawer,
  drawerHeader,
  drawerHeaderLabel,
  drawerClose,
  drawerBody,
  drawerTitleInput,
  fieldStack,
  fieldLabel,
  durationStepper,
  stepperBtn,
  stepperValue,
  dateInput,
  drawerFooter,
} from "./EditDrawer.css";

export function EditDrawer() {
  const { planner, updatePlannerArray, updateAll } = useCalendarProvider();
  const { focusedTask, setFocusedTask } = useDraggableContext();
  const locations = useSelector(
    (state: RootState) => state.schedulingSettings.locations,
  );

  const task = useMemo(
    () => (focusedTask ? planner.find((p) => p.id === focusedTask) : undefined),
    [planner, focusedTask],
  );

  const [titleDraft, setTitleDraft] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleDraft(task?.title ?? "");
  }, [task?.id, task?.title]);

  // Auto-focus + select the title input for freshly created subtasks.
  useEffect(() => {
    if (task?.title === NEW_SUBTASK_TITLE && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [task?.id, task?.title]);

  if (!task) return null;

  const close = () => setFocusedTask(null);

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

  const stepDuration = (delta: number) =>
    setDuration(Math.max(5, (task.duration ?? 0) + delta));

  const onDurationInput = (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (Number.isNaN(v)) return;
    setDuration(Math.max(0, v));
  };

  const onDateInput = (e: ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value ? new Date(e.target.value).toISOString() : null;
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

  const onLocationChange = async (locationId: string | null) => {
    await assignLocationToPlanner(task.id, locationId);
    updatePlannerArray((prev) =>
      prev.map((p) => (p.id === task.id ? { ...p, locationId } : p)),
    );
  };

  const dateValue = (() => {
    if (!task.deadline) return "";
    const d = new Date(task.deadline);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  const locationOptions = [
    { value: null, label: <Caption>Anywhere</Caption> },
    ...locations.map((l) => ({
      value: l.id,
      label: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <MapPin size={12} strokeWidth={2} />
          <span>{l.name}</span>
        </span>
      ),
    })),
  ];

  const currentLocation = locations.find((l) => l.id === task.locationId);

  const handleDelete = () => {
    deleteGoal({ updateAll, taskId: task.id, parentId: task.parentId });
    setShowDeleteConfirm(false);
    setFocusedTask(null);
  };

  return (
    <aside className={drawer}>
      <div className={drawerHeader}>
        <Caption className={drawerHeaderLabel}>Edit subtask</Caption>
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
        <input
          ref={titleInputRef}
          className={drawerTitleInput}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={onTitleKey}
          placeholder="Subtask title"
        />

        <div className={fieldStack}>
          <span className={fieldLabel}>Duration</span>
          <div className={durationStepper}>
            <button
              type="button"
              className={stepperBtn}
              onClick={() => stepDuration(-5)}
              aria-label="Decrease duration"
            >
              <Minus size={12} strokeWidth={2.4} />
            </button>
            <input
              className={stepperValue}
              type="number"
              min={0}
              value={task.duration ? task.duration : ""}
              placeholder="0"
              onChange={onDurationInput}
            />
            <button
              type="button"
              className={stepperBtn}
              onClick={() => stepDuration(5)}
              aria-label="Increase duration"
            >
              <Plus size={12} strokeWidth={2.4} />
            </button>
            <Caption>min</Caption>
          </div>
        </div>

        <div className={fieldStack}>
          <span className={fieldLabel}>Deadline</span>
          <input
            type="datetime-local"
            className={dateInput}
            value={dateValue}
            onChange={onDateInput}
          />
          {task.deadline && (
            <Caption>
              {format(new Date(task.deadline), "EEE MMM d · HH:mm")}
            </Caption>
          )}
        </div>

        <div className={fieldStack}>
          <span className={fieldLabel}>Location</span>
          <LumenDropdown
            value={task.locationId ?? null}
            options={locationOptions}
            onChange={onLocationChange}
            renderValue={() =>
              currentLocation ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
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
      </div>

      <div className={drawerFooter}>
        <Button
          variant="glass"
          size="sm"
          onClick={() => setShowDeleteConfirm(true)}
          aria-label="Delete subtask"
        >
          <Trash2 size={12} strokeWidth={2.2} />
        </Button>
        <Button variant="solid" size="sm" onClick={close}>
          Done
        </Button>
      </div>

      <LumenConfirmModal
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
