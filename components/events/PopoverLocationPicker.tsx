"use client";

import { MapPin } from "lucide-react";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Caption } from "@/components/ui";
import { LumenDropdown } from "@/app/circadium/_components/LumenDropdown";
import { LumenSwitch } from "@/app/circadium/_components/LumenSwitch";
import type { RootState } from "@/redux/store";
import { vars, interactiveTransition } from "@/lib/theme";

interface Props {
  value: string | null;
  onChange: (locationId: string | null) => void;
  /** True when the user has chosen to override the inherited location. */
  isOverridden?: boolean;
  /** Toggle handler; when omitted, override controls are hidden entirely. */
  onToggleOverride?: () => void;
  inheritedLocationName?: string;
  inheritedFromLabel?: string;
}

// Fixed dropdown width so swapping between short and long location names
// doesn't shift the surrounding popover layout.
const DROPDOWN_WIDTH = 200;

export function PopoverLocationPicker({
  value,
  onChange,
  isOverridden,
  onToggleOverride,
  inheritedLocationName,
  inheritedFromLabel,
}: Props) {
  const locations = useSelector(
    (state: RootState) => state.schedulingSettings.locations,
  );

  const hasOverrideControls = !!onToggleOverride;
  const isInheriting = hasOverrideControls && !isOverridden;

  const options = useMemo(
    () => [
      { value: null, label: <Caption>Anywhere</Caption> },
      ...locations.map((l) => ({
        value: l.id,
        label: (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <MapPin size={12} strokeWidth={2} />
            <span>{l.name}</span>
          </span>
        ),
      })),
    ],
    [locations],
  );

  const currentLocation = locations.find((l) => l.id === value);
  const displayName = isInheriting
    ? (inheritedLocationName ?? "Anywhere")
    : (currentLocation?.name ?? "Anywhere");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {hasOverrideControls && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <LumenSwitch
            checked={!!isOverridden}
            onChange={() => onToggleOverride?.()}
            ariaLabel="Override inherited location"
          />
          <span
            style={{
              fontFamily: vars.font.ui,
              fontSize: 11.5,
              color: isOverridden ? vars.ink : vars.muted,
              fontWeight: 600,
            }}
          >
            {isOverridden
              ? "Custom location"
              : `Inherited${inheritedFromLabel ? ` from ${inheritedFromLabel}` : ""}`}
          </span>
        </div>
      )}
      <div
        style={{
          opacity: isInheriting ? 0.55 : 1,
          pointerEvents: isInheriting ? "none" : "auto",
          transition: interactiveTransition("opacity"),
        }}
        aria-disabled={isInheriting || undefined}
      >
        <LumenDropdown<string | null>
          value={isInheriting ? null : value}
          options={options}
          onChange={(v) => onChange(v)}
          width={DROPDOWN_WIDTH}
          renderValue={() => (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                flex: 1,
                minWidth: 0,
              }}
              title={displayName}
            >
              <MapPin
                size={12}
                strokeWidth={2}
                style={{ flexShrink: 0 }}
              />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {displayName}
              </span>
            </span>
          )}
          ariaLabel="Location"
        />
      </div>
    </div>
  );
}

