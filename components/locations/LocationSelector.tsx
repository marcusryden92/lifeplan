"use client";

import { MapPin } from "lucide-react";
import { useSelector } from "react-redux";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import type { RootState } from "@/redux/store";

interface LocationSelectorProps {
  value: string | null | undefined;
  onChange: (locationId: string | null) => void;
  disabled?: boolean;
  className?: string;
  /** Compact mode for inline display (e.g., task headers) */
  compact?: boolean;
  /** Whether the user has overridden the inherited location */
  isOverridden?: boolean;
  /** Callback when the user toggles the override */
  onToggleOverride?: () => void;
  /** Name of the inherited location (shown in the dropdown when inherited) */
  inheritedLocationName?: string;
  /** Label describing the source of inheritance (e.g. category name or parent item title) */
  inheritedFromLabel?: string;
}

export function LocationSelector({
  value,
  onChange,
  disabled = false,
  className,
  compact = false,
  isOverridden,
  onToggleOverride,
  inheritedLocationName,
  inheritedFromLabel,
}: LocationSelectorProps) {
  const locations = useSelector(
    (state: RootState) => state.schedulingSettings.locations,
  );

  // Normalize undefined to null to prevent controlled/uncontrolled switch
  const normalizedValue = value === undefined ? null : value;

  const handleChange = (newValue: string) => {
    onChange(newValue === "everywhere" ? null : newValue);
  };

  const selectedLocation = normalizedValue
    ? locations.find((l) => l.id === normalizedValue)
    : null;

  const showInherited = !!onToggleOverride && !isOverridden;

  if (locations.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger
          className={
            compact
              ? "h-7 w-auto min-w-[80px] text-xs border-none shadow-none"
              : className
          }
        >
          <SelectValue placeholder="No locations" />
        </SelectTrigger>
      </Select>
    );
  }

  const displayedLocationName = showInherited
    ? (inheritedLocationName ?? "Anywhere")
    : (selectedLocation?.name ?? "Anywhere");

  const selectItems = (
    <>
      <SelectItem value="everywhere">
        <span className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          Anywhere
        </span>
      </SelectItem>
      {locations.map((location) => (
        <SelectItem key={location.id} value={location.id}>
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{location.name}</span>
          </span>
        </SelectItem>
      ))}
    </>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <Select
          value={showInherited ? "category-default" : (normalizedValue ?? "everywhere")}
          onValueChange={handleChange}
          disabled={disabled || showInherited}
        >
          <SelectTrigger
            className={`h-7 w-auto min-w-[80px] max-w-[200px] text-xs bg-transparent border-none shadow-none hover:bg-gray-100 focus:ring-0 [&>span]:!flex [&>span]:items-center ${className ?? ""}`}
          >
            <span className="flex min-w-[100px] items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span className="truncate text-gray-600 leading-none">
                {displayedLocationName}
              </span>
            </span>
          </SelectTrigger>
          <SelectContent>{selectItems}</SelectContent>
        </Select>
        {onToggleOverride && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={!!isOverridden}
              onCheckedChange={onToggleOverride}
              className="scale-75"
            />
            {showInherited ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-white bg-gray-400 px-1.5 py-0.5 rounded-full truncate max-w-[160px]">
                Inherited{inheritedFromLabel ? ` from ${inheritedFromLabel}` : ""}
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] text-white bg-black px-1.5 py-0.5 rounded-full">Custom</span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        value={showInherited ? "category-default" : (value ?? "everywhere")}
        onValueChange={handleChange}
        disabled={disabled || showInherited}
      >
        <SelectTrigger className={`w-full ${className ?? ""}`}>
          <SelectValue>
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {displayedLocationName}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>{selectItems}</SelectContent>
      </Select>
      {onToggleOverride && (
        <div className="flex items-center gap-1.5">
          <Switch
            checked={!!isOverridden}
            onCheckedChange={onToggleOverride}
          />
          {showInherited ? (
            <span className="inline-flex items-center gap-1 text-xs text-white bg-gray-400 px-2 py-0.5 rounded-full">
              Inherited{inheritedFromLabel ? <><span className="text-gray-300">from</span> {inheritedFromLabel}</> : ""}
            </span>
          ) : (
            <span className="inline-flex items-center text-xs text-white bg-black px-2 py-0.5 rounded-full">Custom</span>
          )}
        </div>
      )}
    </div>
  );
}
