"use client";

import { space } from "@/lib/theme";
import { format } from "date-fns";
import { Caption, DateTimePicker } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { formatDatetimeLocal } from "@/utils/datetime";
import { useItem } from "../../ItemContext";
import { fieldStack, fieldLabel } from "./DateSection.css";

export function DateSection() {
  const { item, changeDate } = useItem();
  const { weekStartDay } = useCalendarProvider();
  const isPlan = item.plannerType === "plan";
  const isoValue = isPlan ? item.starts : item.deadline;
  const dateValue = formatDatetimeLocal(isoValue);

  return (
    <div className={fieldStack}>
      <span className={fieldLabel}>{isPlan ? "Scheduled" : "Deadline"}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: space["1"] }}>
        <DateTimePicker
          value={dateValue}
          onChange={(v) => changeDate(v ? new Date(v) : undefined)}
          weekStartsOn={weekStartDay}
          ariaLabel={isPlan ? "Scheduled time" : "Deadline"}
        />
        {/* Always rendered so toggling a date doesn't reflow the column.
            Falls back to a non-breaking space + hidden visibility when
            the date is empty. */}
        <Caption style={isoValue ? undefined : { visibility: "hidden" }}>
          {isoValue
            ? format(new Date(isoValue), "EEE MMM d · HH:mm")
            : " "}
        </Caption>
      </div>
    </div>
  );
}
