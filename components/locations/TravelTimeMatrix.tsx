"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TravelTimeCell } from "./TravelTimeCell";
import type { Location, TravelTime } from "@/types/prisma";

type TimePeriod = "rush" | "regular" | "night";

interface TravelTimeMatrixProps {
  locations: Location[];
  travelTimes: TravelTime[];
  onUpdateOverride: (
    travelTimeId: string,
    period: TimePeriod,
    value: number | null,
  ) => Promise<void>;
}

const TIME_PERIODS: {
  value: TimePeriod;
  label: string;
  description: string;
}[] = [
  { value: "rush", label: "Rush Hour", description: "7-9 AM, 5-7 PM weekdays" },
  { value: "regular", label: "Regular", description: "Other daytime hours" },
  { value: "night", label: "Night", description: "9 PM - 6 AM" },
];

export function TravelTimeMatrix({
  locations,
  travelTimes,
  onUpdateOverride,
}: TravelTimeMatrixProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("regular");

  // Create a lookup map for travel times
  const travelTimeMap = new Map<string, TravelTime>();
  travelTimes.forEach((tt) => {
    travelTimeMap.set(`${tt.fromLocationId}-${tt.toLocationId}`, tt);
  });

  const getTravelTime = (
    fromId: string,
    toId: string,
  ): TravelTime | undefined => {
    return travelTimeMap.get(`${fromId}-${toId}`);
  };

  const getEffectiveTime = (travelTime: TravelTime): number => {
    switch (selectedPeriod) {
      case "rush":
        return (
          travelTime.customRushHourMinutes ?? travelTime.googleRushHourMinutes
        );
      case "regular":
        return (
          travelTime.customRegularMinutes ?? travelTime.googleRegularMinutes
        );
      case "night":
        return travelTime.customNightMinutes ?? travelTime.googleNightMinutes;
    }
  };

  const getGoogleTime = (travelTime: TravelTime): number => {
    switch (selectedPeriod) {
      case "rush":
        return travelTime.googleRushHourMinutes;
      case "regular":
        return travelTime.googleRegularMinutes;
      case "night":
        return travelTime.googleNightMinutes;
    }
  };

  const hasOverride = (travelTime: TravelTime): boolean => {
    switch (selectedPeriod) {
      case "rush":
        return travelTime.customRushHourMinutes !== null;
      case "regular":
        return travelTime.customRegularMinutes !== null;
      case "night":
        return travelTime.customNightMinutes !== null;
    }
  };

  if (locations.length < 2) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Add at least 2 locations to see travel times.</p>
      </div>
    );
  }

  if (travelTimes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No travel times fetched yet.</p>
        <p className="text-sm">
          Click &quot;Fetch Travel Times&quot; to calculate travel times.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time Period Toggle */}
      <div className="flex gap-2">
        {TIME_PERIODS.map((period) => (
          <Button
            key={period.value}
            variant={selectedPeriod === period.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPeriod(period.value)}
            className="text-xs"
          >
            {period.label}
          </Button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {TIME_PERIODS.find((p) => p.value === selectedPeriod)?.description}
      </p>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-2 bg-muted text-left font-medium">
                From / To
              </th>
              {locations.map((loc) => (
                <th
                  key={loc.id}
                  className="border p-2 bg-muted text-center font-medium min-w-[80px]"
                >
                  {loc.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {locations.map((fromLocation) => (
              <tr key={fromLoc.id}>
                <td className="border p-2 bg-muted font-medium">
                  {fromLoc.name}
                </td>
                {locations.map((toLocation) => {
                  if (fromLoc.id === toLoc.id) {
                    return (
                      <td
                        key={toLoc.id}
                        className="border p-2 text-center bg-muted/50 text-muted-foreground"
                      >
                        -
                      </td>
                    );
                  }

                  const travelTime = getTravelTime(fromLoc.id, toLoc.id);

                  if (!travelTime) {
                    return (
                      <td
                        key={toLoc.id}
                        className="border p-2 text-center text-muted-foreground"
                      >
                        --
                      </td>
                    );
                  }

                  return (
                    <TravelTimeCell
                      key={toLoc.id}
                      travelTime={travelTime}
                      effectiveMinutes={getEffectiveTime(travelTime)}
                      googleMinutes={getGoogleTime(travelTime)}
                      hasOverride={hasOverride(travelTime)}
                      period={selectedPeriod}
                      onUpdateOverride={onUpdateOverride}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        * Cells with a colored background have custom overrides. Click a cell to
        edit.
      </p>
    </div>
  );
}
