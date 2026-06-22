"use client";

import { Button, vars } from "@/components/ui";
import type { EventTemplate } from "@/types/prisma";
import { TEMPLATE_PALETTE } from "../constants";
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
  swatchRow,
  swatchChip,
  selectedActions,
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
  return (
    <div className={selectedPanel}>
      <div className={selectedHeaderRow}>
        <span
          className={selectedSwatch}
          style={{ background: template.color || TEMPLATE_PALETTE[0] }}
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
        <span className={fieldLabel}>color</span>
        <div className={swatchRow}>
          {TEMPLATE_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className={swatchChip}
              data-active={template.color === c}
              style={{ background: c }}
              onClick={() => onUpdate({ color: c })}
              aria-label={`color ${c}`}
            />
          ))}
        </div>
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
