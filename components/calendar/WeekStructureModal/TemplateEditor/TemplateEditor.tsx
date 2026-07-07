"use client";

import { useMemo } from "react";
import { Button, vars } from "@/components/ui";
import type { EventTemplate } from "@/types/prisma";
import { PopoverLocationPicker } from "@/components/events/PopoverLocationPicker";
import { PopoverColorPicker } from "@/components/events/PopoverColorPicker";
import { RecurrenceExceptionList } from "@/components/events/RecurrenceExceptionList";
import { calendarColors } from "@/data/calendarColors";
import {
  parseRecurrenceExceptions,
  serializeRecurrenceExceptions,
  removeException,
} from "@/utils/planRecurrence";
import { addMinutesToHHMM } from "../timeWindow";
import {
  selectedPanel,
  selectedHeaderRow,
  selectedSwatch,
  selectedTitle,
  fieldGrid,
  field,
  fieldWithMargin,
  fieldLabel,
  fieldInput,
  fieldStatic,
  selectedActions,
  exceptionsSection,
} from "./TemplateEditor.css";

interface TemplateEditorProps {
  template: EventTemplate;
  onUpdate: (patch: Partial<EventTemplate>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function TemplateEditor({
  template,
  onUpdate,
  onDuplicate,
  onDelete,
}: TemplateEditorProps) {
  const exceptions = useMemo(
    () => parseRecurrenceExceptions(template.recurrenceExceptions),
    [template.recurrenceExceptions],
  );
  const restoreException = (key: string) => {
    onUpdate({
      recurrenceExceptions: serializeRecurrenceExceptions(
        removeException(exceptions, key),
      ),
    });
  };

  return (
    <div className={selectedPanel}>
      <div className={selectedHeaderRow}>
        <span
          className={selectedSwatch}
          style={{ background: template.color || calendarColors[0] }}
        />
        <span className={selectedTitle}>{template.title || "Untitled"}</span>
      </div>

      <div className={fieldWithMargin}>
        <span className={fieldLabel}>name</span>
        <input
          className={fieldInput}
          value={template.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
      </div>

      <div className={fieldGrid}>
        <div className={field}>
          <span className={fieldLabel}>start</span>
          <span className={fieldStatic}>{template.startTime}</span>
        </div>
        <div className={field}>
          <span className={fieldLabel}>end</span>
          <span className={fieldStatic}>
            {addMinutesToHHMM(template.startTime, template.duration)}
          </span>
        </div>
      </div>

      <div className={fieldWithMargin}>
        <span className={fieldLabel}>location</span>
        <PopoverLocationPicker
          value={template.locationId ?? null}
          onChange={(locationId) => onUpdate({ locationId })}
        />
      </div>

      <div className={fieldWithMargin}>
        <span className={fieldLabel}>color</span>
        <PopoverColorPicker
          currentColor={template.color || calendarColors[0]}
          onChange={(c) => onUpdate({ color: c })}
        />
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

      {exceptions.length > 0 && (
        <div className={exceptionsSection}>
          <span className={fieldLabel}>exceptions</span>
          <RecurrenceExceptionList
            exceptions={exceptions}
            onRestore={restoreException}
            variant="rail"
          />
        </div>
      )}
    </div>
  );
}
