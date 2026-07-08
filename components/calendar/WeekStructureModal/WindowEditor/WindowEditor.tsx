"use client";

import { useMemo } from "react";
import { Button, vars } from "@/components/ui";
import type { Category } from "@/types/prisma";
import { WindowExceptionEditor } from "@/components/events/WindowExceptionEditor";
import {
  parseRecurrenceExceptions,
  serializeRecurrenceExceptions,
} from "@/utils/planRecurrence";
import { buildIndentedCategoryList } from "@/utils/categoryUtils";
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
  exceptionsSection,
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
  const exceptions = useMemo(
    () => parseRecurrenceExceptions(win.recurrenceExceptions),
    [win.recurrenceExceptions],
  );
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
          {buildIndentedCategoryList(categories).map((c) => (
            <button
              key={c.id}
              type="button"
              className={categoryOption}
              data-active={win.categoryId === c.id}
              onClick={() => onUpdate({ categoryId: c.id })}
              style={c.depth > 0 ? { marginLeft: c.depth * 12 } : undefined}
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

      {win.categoryId !== null && (
        <div className={exceptionsSection}>
          <span className={fieldLabel}>exceptions</span>
          <WindowExceptionEditor
            window={win}
            exceptions={exceptions}
            onChange={(next) =>
              onUpdate({
                recurrenceExceptions: serializeRecurrenceExceptions(next),
              })
            }
            variant="rail"
          />
        </div>
      )}
    </div>
  );
}
