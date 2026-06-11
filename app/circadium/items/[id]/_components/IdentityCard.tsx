"use client";

import { useMemo, type ChangeEvent } from "react";
import { MapPin, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { Caption, Button, CategoryBadge } from "@/components/ui";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { useItem } from "./ItemContext";
import { LumenDropdown } from "./LumenDropdown";
import { formatMinutesToHours } from "@/utils/taskArrayUtils";
import type { PlannerType } from "@/lib/generated/db-client";
import {
  card,
  cardHeader,
  cardTitle,
  cardBody,
  fieldGrid,
  fieldStack,
  fieldLabel,
  fieldValue,
  typePicker,
  typePickerBtn,
  typePickerBtnActive,
  priorityRow,
  priorityPill,
  priorityPillActive,
  numberInput,
  dateInput,
  inheritedHint,
  placeRow,
  overrideToggle,
} from "./IdentityCard.css";

export function IdentityCard() {
  const {
    item,
    category,
    categories,
    totalDuration,
    locationOverrideEnabled,
    categoryHasLocation,
    setPlannerType,
    updateField,
    changeCategory,
    changeLocation,
    toggleLocationOverride,
    changeDate,
    requestResetSubgoalLocations,
  } = useItem();

  const locations = useSelector(
    (state: RootState) => state.schedulingSettings.locations,
  );

  const isGoal = item.plannerType === "goal";
  const isPlan = item.plannerType === "plan";

  const categoryOptions = useMemo(
    () => [
      { value: null, label: <Caption>No category</Caption> },
      ...categories.map((c) => ({
        value: c.id,
        label: (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
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
    ],
    [categories],
  );

  const locationOptions = useMemo(
    () => [
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
    ],
    [locations],
  );

  const currentLocation = locations.find((l) => l.id === item.locationId);
  const dateValue = (() => {
    const iso = isPlan ? item.starts : item.deadline;
    if (!iso) return "";
    const d = new Date(iso);
    // datetime-local needs YYYY-MM-DDTHH:mm in local time
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  const onDateInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    changeDate(v ? new Date(v) : undefined);
  };

  return (
    <div className={card}>
      <div className={cardHeader}>
        <span className={cardTitle}>Identity</span>
      </div>
      <div className={cardBody}>
        <div className={fieldGrid}>
          {/* Type */}
          <div className={fieldStack}>
            <span className={fieldLabel}>Type</span>
            <div className={typePicker}>
              {(["task", "plan", "goal"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${typePickerBtn} ${
                    item.plannerType === t ? typePickerBtnActive : ""
                  }`}
                  onClick={() => setPlannerType(t as PlannerType)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Area */}
          <div className={fieldStack}>
            <span className={fieldLabel}>Area</span>
            <LumenDropdown
              value={item.categoryId ?? null}
              options={categoryOptions}
              onChange={(v) => changeCategory(v)}
              renderValue={() =>
                category ? (
                  <CategoryBadge color={category.color ?? "#888"}>
                    {category.name}
                  </CategoryBadge>
                ) : (
                  <Caption>No category</Caption>
                )
              }
              ariaLabel="Category"
            />
          </div>

          {/* Priority */}
          <div className={fieldStack}>
            <span className={fieldLabel}>Priority</span>
            <div className={priorityRow}>
              {Array.from({ length: 11 }).map((_, p) => (
                <button
                  key={p}
                  type="button"
                  className={`${priorityPill} ${
                    item.priority === p ? priorityPillActive : ""
                  }`}
                  onClick={() => updateField("priority", p)}
                  aria-label={`Priority ${p}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className={fieldStack}>
            <span className={fieldLabel}>
              {isGoal ? "Rolled-up duration" : "Duration (min)"}
            </span>
            {isGoal ? (
              <span className={fieldValue}>
                {formatMinutesToHours(totalDuration)}
              </span>
            ) : (
              <input
                className={numberInput}
                type="number"
                min={1}
                value={item.duration}
                onChange={(e) =>
                  updateField("duration", Number(e.target.value))
                }
              />
            )}
          </div>

          {/* Place */}
          <div className={fieldStack}>
            <span className={fieldLabel}>Place</span>
            <div className={placeRow}>
              <LumenDropdown
                value={item.locationId ?? null}
                options={locationOptions}
                onChange={(v) => changeLocation(v)}
                renderValue={(opt) => {
                  if (currentLocation) {
                    return (
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
                    );
                  }
                  if (opt) return opt.label;
                  return <Caption>Anywhere</Caption>;
                }}
                ariaLabel="Location"
              />
              {categoryHasLocation && (
                <button
                  type="button"
                  className={overrideToggle}
                  onClick={toggleLocationOverride}
                  aria-pressed={locationOverrideEnabled}
                  title={
                    locationOverrideEnabled
                      ? "Override on — using this item's place"
                      : "Inheriting place from category"
                  }
                >
                  {locationOverrideEnabled ? "Override" : "Inherited"}
                </button>
              )}
            </div>
            {categoryHasLocation && !locationOverrideEnabled && (
              <Caption className={inheritedHint}>
                from {category?.name}
              </Caption>
            )}
            {isGoal && (
              <div style={{ marginTop: 6 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={requestResetSubgoalLocations}
                >
                  <RotateCcw size={11} strokeWidth={2.2} />
                  Reset sub-goal places
                </Button>
              </div>
            )}
          </div>

          {/* Deadline / Scheduled */}
          <div className={fieldStack}>
            <span className={fieldLabel}>
              {isPlan ? "Scheduled" : "Deadline"}
            </span>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 4 }}
            >
              <input
                type="datetime-local"
                className={dateInput}
                value={dateValue}
                onChange={onDateInputChange}
              />
              {(item.deadline || item.starts) && (
                <Caption>
                  {format(
                    new Date(
                      (isPlan ? item.starts : item.deadline) as string,
                    ),
                    "EEE MMM d · HH:mm",
                  )}
                </Caption>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
