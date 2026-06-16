"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Lock, MapPin, SquarePen, Trash2 } from "lucide-react";
import { Button, Caption, vars } from "@/components/ui";
import { LumenDropdown } from "@/app/circadium/_components/LumenDropdown";
import type { Category } from "@/types/prisma";
import type { SerializedLocation } from "@/redux/slices/schedulingSettingsSlice";
import { WindowsMiniGrid } from "./WindowsMiniGrid";
import {
  editor,
  header,
  headerSwatch,
  headerInfo,
  headerName,
  headerNameInput,
  headerNamePencil,
  headerNameRow,
  headerSummary,
  headerActions,
  section,
  sectionPair,
  sectionTitle,
  fieldGrid,
  fieldStack,
  fieldLabel,
  swatchRow,
  swatchChip,
  strictRow,
  strictToggle,
  strictToggleThumb,
  strictLabel,
  sectionHelp,
  windowsSubsection,
  subsectionLabel,
  classificationNote,
  subAreasList,
  subAreaRow,
  subAreaDot,
  subAreaName,
  subAreaMeta,
} from "./AreaEditor.css";

export const SWATCH_PALETTE = [
  "#3b82f6",
  "#22c55e",
  "#8b5cf6",
  "#6366f1",
  "#06b6d4",
  "#f59e0b",
  "#f43f5e",
  "#14b8a6",
];

const FALLBACK_COLOR = "#9ca3af";

interface AreaEditorProps {
  category: Category;
  categories: Category[];
  locations: SerializedLocation[];
  itemCount: number;
  subAreas: Category[];
  subAreaCounts: Map<string, number>;
  onRename: (name: string) => void;
  onChangeColor: (color: string) => void;
  onChangeParent: (parentId: string | null) => void;
  onChangeLocation: (locationId: string | null) => void;
  onToggleStrict: () => void;
  onToggleUseTimeWindows: () => void;
  onDelete: () => void;
  onSelectSubArea: (id: string) => void;
  onOpenWindows: () => void;
}

export function AreaEditor({
  category,
  categories,
  locations,
  itemCount,
  subAreas,
  subAreaCounts,
  onRename,
  onChangeColor,
  onChangeParent,
  onChangeLocation,
  onToggleStrict,
  onToggleUseTimeWindows,
  onDelete,
  onSelectSubArea,
  onOpenWindows,
}: AreaEditorProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(category.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset the draft when switching to a different area so we don't carry stale
  // input into the next editor.
  useEffect(() => {
    setNameDraft(category.name);
    setEditingName(false);
  }, [category.id, category.name]);

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editingName]);

  const commitName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== category.name) {
      onRename(trimmed);
    } else {
      setNameDraft(category.name);
    }
    setEditingName(false);
  };

  const cancelName = () => {
    setNameDraft(category.name);
    setEditingName(false);
  };

  const color = category.color || FALLBACK_COLOR;
  const initial = category.name.charAt(0).toUpperCase() || "?";

  const parentOptions = [
    { value: null as string | null, label: <Caption>Top-level</Caption> },
    ...categories
      .filter((c) => c.id !== category.id && c.parentId !== category.id)
      .map((c) => ({
        value: c.id,
        label: (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {c.color && (
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  background: c.color,
                  flexShrink: 0,
                }}
              />
            )}
            <span>{c.name}</span>
          </span>
        ),
      })),
  ];

  const locationOptions = [
    { value: null as string | null, label: <Caption>No default</Caption> },
    ...locations.map((l) => ({
      value: l.id,
      label: (
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <MapPin size={12} strokeWidth={2} />
          <span>{l.name}</span>
        </span>
      ),
    })),
  ];

  const currentLocation = locations.find((l) => l.id === category.locationId);
  const summary = [
    `${itemCount} item${itemCount === 1 ? "" : "s"}`,
    subAreas.length > 0
      ? `${subAreas.length} sub-categor${subAreas.length === 1 ? "y" : "ies"}`
      : null,
    category.isStrict ? "strict" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={editor}>
      <div className={header}>
        <div className={headerSwatch} style={{ background: color }}>
          {initial}
        </div>
        <div className={headerInfo}>
          <div className={headerNameRow}>
            {editingName ? (
              <input
                ref={nameInputRef}
                className={headerNameInput}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  else if (e.key === "Escape") cancelName();
                }}
                aria-label="Category name"
              />
            ) : (
              <>
                <h2
                  className={headerName}
                  onClick={() => setEditingName(true)}
                  title="Click to rename"
                >
                  {category.name}
                </h2>
                <button
                  type="button"
                  className={headerNamePencil}
                  onClick={() => setEditingName(true)}
                  aria-label="Rename category"
                >
                  <SquarePen size={14} strokeWidth={2} />
                </button>
              </>
            )}
          </div>
          <div className={headerSummary}>{summary}</div>
        </div>
        <div className={headerActions}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label="Delete category"
          >
            <Trash2 size={12} strokeWidth={2.2} />
            Delete
          </Button>
        </div>
      </div>

      <div className={section}>
        <div className={sectionTitle}>Identity</div>
        <div className={fieldGrid}>
          <div className={fieldStack}>
            <span className={fieldLabel}>Color</span>
            <div className={swatchRow}>
              {SWATCH_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={swatchChip}
                  data-active={color.toLowerCase() === c.toLowerCase()}
                  style={{ background: c }}
                  onClick={() => onChangeColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          <div className={fieldStack}>
            <span className={fieldLabel}>Parent category</span>
            <LumenDropdown
              value={category.parentId ?? null}
              options={parentOptions}
              onChange={(v) => onChangeParent(v)}
              ariaLabel="Parent category"
            />
          </div>
        </div>
      </div>

      <div className={sectionPair}>
        <div className={section}>
          <div className={sectionTitle}>Default location</div>
          <LumenDropdown
            value={category.locationId ?? null}
            options={locationOptions}
            onChange={(v) => onChangeLocation(v)}
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
                <Caption>No default</Caption>
              )
            }
            ariaLabel="Default location"
          />
          <div className={sectionHelp}>
            Items in this category inherit this location unless overridden.
          </div>
        </div>
        <div className={section}>
          <div className={sectionTitle}>Uses time windows</div>
          <div className={strictRow}>
            <button
              type="button"
              className={strictToggle}
              data-on={category.useTimeWindows}
              onClick={onToggleUseTimeWindows}
              aria-pressed={category.useTimeWindows}
              aria-label="Toggle time-window scheduling"
            >
              <span className={strictToggleThumb} />
            </button>
            <span className={strictLabel}>
              {category.useTimeWindows ? "On" : "Off"}
            </span>
          </div>
          <div className={sectionHelp}>
            {category.useTimeWindows
              ? "Items in this category schedule into the weekly windows below."
              : "Items in this category schedule freely — it's used for classification only."}
          </div>
        </div>
      </div>

      {category.useTimeWindows ? (
        <div className={section}>
          <div className={sectionTitle}>Time windows</div>
          <div className={windowsSubsection}>
            <span className={subsectionLabel}>Strict mode</span>
            <div className={strictRow}>
              <button
                type="button"
                className={strictToggle}
                data-on={category.isStrict}
                onClick={onToggleStrict}
                aria-pressed={category.isStrict}
                aria-label="Toggle strict mode"
              >
                <span className={strictToggleThumb} />
              </button>
              <span className={strictLabel}>
                {category.isStrict ? "On" : "Off"}
              </span>
              <Lock
                size={13}
                strokeWidth={2}
                style={{
                  color: category.isStrict ? vars.accent.primary : vars.muted,
                  opacity: category.isStrict ? 1 : 0.5,
                }}
              />
            </div>
            <div className={sectionHelp}>
              {category.isStrict
                ? `Only ${category.name} items can be scheduled inside these windows.`
                : "Other items may fill empty space inside these windows."}
            </div>
          </div>
          <span className={subsectionLabel}>Weekly windows</span>
          <WindowsMiniGrid
            windows={category.timeSlots}
            color={color}
            onOpen={onOpenWindows}
          />
        </div>
      ) : (
        <div className={section}>
          <div className={sectionTitle}>Time windows</div>
          <div className={classificationNote}>
            This category doesn&apos;t use time-window scheduling. Items in it
            schedule wherever there&apos;s capacity. Turn on{" "}
            <strong>Uses time windows</strong> to add weekly windows or strict
            mode.
          </div>
        </div>
      )}

      {subAreas.length > 0 && (
        <div className={section}>
          <div className={sectionTitle}>
            Sub-categories · {subAreas.length}
          </div>
          <div className={subAreasList}>
            {subAreas.map((s) => {
              const count = subAreaCounts.get(s.id) ?? 0;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={subAreaRow}
                  onClick={() => onSelectSubArea(s.id)}
                >
                  <span
                    className={subAreaDot}
                    style={{ background: s.color || FALLBACK_COLOR }}
                  />
                  <span className={subAreaName}>{s.name}</span>
                  <span className={subAreaMeta}>
                    {count} item{count === 1 ? "" : "s"}
                  </span>
                  <ChevronRight
                    size={14}
                    strokeWidth={2}
                    style={{
                      color: vars.muted,
                      justifySelf: "end",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
