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
  /** Category name when location is inherited from a category */
  categoryName?: string;
  /** Category's default location name */
  categoryLocationName?: string;
  /** Whether the user has overridden the category location */
  isOverridden?: boolean;
  /** Callback when the user toggles the override */
  onToggleOverride?: () => void;
}

export function LocationSelector({
  value,
  onChange,
  disabled = false,
  className,
  compact = false,
  categoryName,
  categoryLocationName,
  isOverridden,
  onToggleOverride,
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

  const hasCategoryLocation = !!categoryLocationName;
  const showCategoryDefault = hasCategoryLocation && !isOverridden;

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

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <Select
          value={showCategoryDefault ? "category-default" : (normalizedValue ?? "everywhere")}
          onValueChange={handleChange}
          disabled={disabled || showCategoryDefault}
        >
          <SelectTrigger
            className={`h-7 w-auto min-w-[80px] max-w-[200px] text-xs bg-transparent border-none shadow-none hover:bg-gray-100 focus:ring-0 [&>span]:!flex [&>span]:items-center ${className ?? ""}`}
          >
            <span className="flex min-w-[100px] items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span className="truncate text-gray-600 leading-none">
                {showCategoryDefault
                  ? `${categoryName}: ${categoryLocationName}`
                  : (selectedLocation?.name ?? "Anywhere")}
              </span>
            </span>
          </SelectTrigger>
          <SelectContent>
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
          </SelectContent>
        </Select>
        {hasCategoryLocation && onToggleOverride && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={!!isOverridden}
              onCheckedChange={onToggleOverride}
              className="scale-75"
            />
            <span className="text-[10px] text-gray-400">Custom</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={showCategoryDefault ? "category-default" : (value ?? "everywhere")}
        onValueChange={handleChange}
        disabled={disabled || showCategoryDefault}
      >
        <SelectTrigger className={`flex-1 ${className ?? ""}`}>
          <SelectValue>
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {showCategoryDefault
                ? `${categoryName}: ${categoryLocationName}`
                : (selectedLocation?.name ?? "Anywhere")}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
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
                <span> {location.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasCategoryLocation && onToggleOverride && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Switch
            checked={!!isOverridden}
            onCheckedChange={onToggleOverride}
          />
          <span className="text-xs text-muted-foreground">Custom</span>
        </div>
      )}
    </div>
  );
}
