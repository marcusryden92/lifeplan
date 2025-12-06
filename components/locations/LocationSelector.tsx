"use client";

import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import * as locationActions from "@/actions/locations";
import type { Location } from "@/types/prisma";

interface LocationSelectorProps {
  value: string | null | undefined;
  onChange: (locationId: string | null) => void;
  disabled?: boolean;
  className?: string;
  /** Compact mode for inline display (e.g., task headers) */
  compact?: boolean;
}

export function LocationSelector({
  value,
  onChange,
  disabled = false,
  className,
  compact = false,
}: LocationSelectorProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Normalize undefined to null to prevent controlled/uncontrolled switch
  const normalizedValue = value === undefined ? null : value;

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const locs = await locationActions.fetchLocations();
      setLocations(locs);
    } catch (err) {
      console.error("Failed to load locations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (newValue: string) => {
    onChange(newValue === "everywhere" ? null : newValue);
  };

  const selectedLocation = normalizedValue
    ? locations.find((l) => l.id === normalizedValue)
    : null;

  // Always use controlled Select to prevent controlled/uncontrolled switch
  const selectValue = normalizedValue ?? "everywhere";

  if (loading) {
    return (
      <Select value={selectValue} disabled>
        <SelectTrigger className={compact ? "h-7 w-auto min-w-[80px] text-xs border-none shadow-none" : className}>
          <span className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            Loading...
          </span>
        </SelectTrigger>
      </Select>
    );
  }

  if (locations.length === 0) {
    return (
      <Select value={selectValue} disabled>
        <SelectTrigger className={compact ? "h-7 w-auto min-w-[80px] text-xs border-none shadow-none" : className}>
          <span className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            No locations
          </span>
        </SelectTrigger>
      </Select>
    );
  }

  if (compact) {
    return (
      <Select
        value={selectValue}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger
          className={`h-7 w-auto min-w-[80px] max-w-[140px] text-xs bg-transparent border-none shadow-none hover:bg-gray-100 focus:ring-0 ${className ?? ""}`}
        >
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate text-gray-600">
              {selectedLocation?.name ?? "Everywhere"}
            </span>
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="everywhere">
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Everywhere
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
    );
  }

  return (
    <Select
      value={selectValue}
      onValueChange={handleChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue>
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {selectedLocation?.name ?? "Everywhere"}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="everywhere">
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            Everywhere
          </span>
        </SelectItem>
        {locations.map((location) => (
          <SelectItem key={location.id} value={location.id}>
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {location.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
