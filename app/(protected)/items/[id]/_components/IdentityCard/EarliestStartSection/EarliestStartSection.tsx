"use client";

import { space } from "@/lib/theme";
import { DateTimePicker, FieldStack } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { formatDatetimeLocal } from "@/utils/datetime";
import { useItem } from "../../ItemContext";

export function EarliestStartSection() {
  const { item, updateField } = useItem();
  const { weekStartDay } = useCalendarProvider();

  // Plans are fixed anchors — they schedule at `starts`, never dynamically.
  if (item.plannerType === "plan") return null;

  return (
    <FieldStack label="Earliest start">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: space["1"],
          maxWidth: "220px",
        }}
      >
        <DateTimePicker
          value={formatDatetimeLocal(item.earliestStartDate)}
          onChange={(v) =>
            updateField(
              "earliestStartDate",
              v ? new Date(v).toISOString() : null,
            )
          }
          weekStartsOn={weekStartDay}
          ariaLabel="Earliest start"
        />
      </div>
    </FieldStack>
  );
}
