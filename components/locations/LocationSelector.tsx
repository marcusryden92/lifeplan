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
import type { RootState } from "@/redux/store";

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
      <Select
        value={normalizedValue ?? "everywhere"}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger
          className={`h-7 w-auto min-w-[80px] max-w-[140px] text-xs bg-transparent border-none shadow-none hover:bg-gray-100 focus:ring-0 [&>span]:!flex [&>span]:items-center ${className ?? ""}`}
        >
          <span className="flex min-w-[100px] items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span className="truncate text-gray-600 leading-none">
              {selectedLocation?.name ?? "Anywhere"}
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
    );
  }

  return (
    <Select
      value={value ?? "everywhere"}
      onValueChange={handleChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue>
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {selectedLocation?.name ?? "Anywhere"}
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
  );
}
