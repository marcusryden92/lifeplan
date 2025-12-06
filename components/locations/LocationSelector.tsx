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
  value: string | null;
  onChange: (locationId: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function LocationSelector({
  value,
  onChange,
  disabled = false,
  className,
}: LocationSelectorProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Loading..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (locations.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="No locations" />
        </SelectTrigger>
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
            {value
              ? locations.find((l) => l.id === value)?.name ?? "Unknown"
              : "Everywhere"}
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
