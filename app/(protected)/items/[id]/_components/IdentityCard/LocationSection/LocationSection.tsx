"use client";

import { useMemo } from "react";
import { MapPin, RotateCcw } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { Button, Caption, Combobox } from "@/components/ui";
import { useItem } from "../../ItemContext";
import {
  fieldStack,
  fieldLabel,
  placeRow,
  overrideToggle,
  inheritedHint,
  flushLeftBtn,
} from "./LocationSection.css";

export function LocationSection() {
  const {
    item,
    category,
    locationOverrideEnabled,
    categoryHasLocation,
    changeLocation,
    toggleLocationOverride,
    requestResetSubgoalLocations,
  } = useItem();

  const locations = useSelector(
    (state: RootState) => state.schedulingSettings.locations,
  );

  const isGoal = item.plannerType === "goal";

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

  return (
    <div className={fieldStack}>
      <span className={fieldLabel}>Place</span>
      <div className={placeRow}>
        <Combobox
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
        {categoryHasLocation && !locationOverrideEnabled && (
          <span className={inheritedHint}>from {category?.name}</span>
        )}
      </div>
      <div
        style={{
          marginTop: 6,
          visibility: isGoal ? "visible" : "hidden",
        }}
        aria-hidden={!isGoal}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={requestResetSubgoalLocations}
          disabled={!isGoal}
          className={flushLeftBtn}
        >
          <RotateCcw size={11} strokeWidth={2.2} />
          Reset sub-goal places
        </Button>
      </div>
    </div>
  );
}
