"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Button, Caption, SegmentedControl } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { fallbackCalendarColor } from "@/utils/colorUtils";
import type { Planner } from "@/types/prisma";
import {
  overlay,
  dialog,
  header,
  titleInput,
  field,
  fieldLabel,
  durationRow,
  durationInput,
  durationUnit,
  footer,
} from "./NewItemModal.css";

type NewItemType = "task" | "plan" | "goal";

const DEFAULT_DURATION_MINUTES = 30;
// Non-goal items must carry a positive duration or the engine rejects them and
// blanks the calendar; goals are duration-exempt and size from their subtasks.
const MIN_DURATION_MINUTES = 15;

export function NewItemModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { userId, updatePlannerArray } = useCalendarProvider();
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<NewItemType>("task");
  const [duration, setDuration] = useState(String(DEFAULT_DURATION_MINUTES));

  useEffect(() => {
    if (open) {
      setTitle("");
      setType("task");
      setDuration(String(DEFAULT_DURATION_MINUTES));
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const canSubmit = title.trim().length > 0;

  const create = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const isGoal = type === "goal";
    const parsed = Math.round(Number(duration));
    const resolvedDuration = isGoal
      ? 0
      : Math.max(MIN_DURATION_MINUTES, Number.isFinite(parsed) ? parsed : DEFAULT_DURATION_MINUTES);

    const id = uuidv4();
    const newItem: Planner = {
      id,
      title: trimmed,
      parentId: null,
      plannerType: type,
      isReady: false,
      // Library-created items are managed items, not inbox jots — they skip
      // the triage queue and are immediately visible to scheduling and the
      // AI assistant.
      isTriaged: true,
      duration: resolvedDuration,
      deadline: null,
      starts: null,
      recurrence: null,
      recurrenceExceptions: null,
      splitting: null,
      completedSegments: null,
      sortOrder: 0,
      completedStartTime: null,
      completedEndTime: null,
      priority: 5,
      userId,
      // A palette color keyed on the id, not the silent red default.
      color: fallbackCalendarColor(id),
      locationId: null,
      useParentLocation: false,
      categoryId: null,
      createdAt: now,
      updatedAt: now,
    };
    updatePlannerArray((prev: Planner[]) => [...prev, newItem]);
    onOpenChange(false);
    router.push(`/items/${id}`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !canSubmit) return;
    e.preventDefault();
    create();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content
          className={dialog}
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className={header}>
            <Caption>new item · goes straight to your library</Caption>
          </div>
          <Dialog.Title style={{ position: "absolute", left: -10000 }}>
            New item
          </Dialog.Title>

          <input
            ref={inputRef}
            className={titleInput}
            placeholder="What is it?"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={onKeyDown}
          />

          <div className={field}>
            <span className={fieldLabel}>Type</span>
            <SegmentedControl<NewItemType>
              value={type}
              onChange={setType}
              options={[
                { key: "task", label: "Task" },
                { key: "plan", label: "Plan" },
                { key: "goal", label: "Goal" },
              ]}
            />
          </div>

          {type !== "goal" && (
            <div className={field}>
              <span className={fieldLabel}>Duration</span>
              <div className={durationRow}>
                <input
                  className={durationInput}
                  type="number"
                  min={MIN_DURATION_MINUTES}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  onKeyDown={onKeyDown}
                />
                <span className={durationUnit}>minutes</span>
              </div>
            </div>
          )}

          <div className={footer}>
            <Button variant="glass" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              size="sm"
              onClick={create}
              disabled={!canSubmit}
            >
              Create
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
