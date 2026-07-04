"use client";

import { Button, vars } from "@/components/ui";
import type { Category } from "@/types/prisma";
import { UNASSIGNED_COLOR } from "../constants";
import type { WorkingWindow } from "../timeWindow";
import {
  selectedPanel,
  selectedHeaderRow,
  selectedSwatch,
  selectedTitle,
  fieldGrid,
  field,
  fieldWithMargin,
  fieldLabel,
  fieldStatic,
  categoryRow,
  categoryOption,
  categoryDot,
  selectedActions,
  unassignedHint,
} from "./WindowEditor.css";

interface WindowEditorProps {
  window: WorkingWindow;
  categories: Category[];
  onUpdate: (patch: Partial<WorkingWindow>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function WindowEditor({
  window: win,
  categories,
  onUpdate,
  onDuplicate,
  onDelete,
}: WindowEditorProps) {
  const cat = win.categoryId
    ? categories.find((c) => c.id === win.categoryId)
    : null;
  return (
    <div className={selectedPanel}>
      <div className={selectedHeaderRow}>
        <span
          className={selectedSwatch}
          style={{ background: cat?.color || UNASSIGNED_COLOR }}
        />
        <span className={selectedTitle}>{cat?.name || "Unassigned"}</span>
      </div>

      <div className={fieldGrid}>
        <div className={field}>
          <span className={fieldLabel}>start</span>
          <span className={fieldStatic}>{win.startTime}</span>
        </div>
        <div className={field}>
          <span className={fieldLabel}>end</span>
          <span className={fieldStatic}>{win.endTime}</span>
        </div>
      </div>

      <div className={fieldWithMargin}>
        <span className={fieldLabel}>category</span>
        <div className={categoryRow}>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={categoryOption}
              data-active={win.categoryId === c.id}
              onClick={() => onUpdate({ categoryId: c.id })}
            >
              <span
                className={categoryDot}
                style={{ background: c.color || UNASSIGNED_COLOR }}
              />
              {c.name}
            </button>
          ))}
        </div>
        {win.categoryId === null && (
          <span className={unassignedHint}>
            Pick a category — unassigned windows are discarded on save.
          </span>
        )}
      </div>

      <div className={selectedActions}>
        <Button variant="glass" size="sm" onClick={onDuplicate}>
          Duplicate
        </Button>
        <Button
          variant="glass"
          size="sm"
          onClick={onDelete}
          style={{ color: vars.status.error }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
