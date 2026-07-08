"use client";

import { space } from "@/lib/theme";
import { DateTimePicker } from "@/components/ui";
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: space["1"],
          maxWidth: "200px",
        }}
      >
        <DateTimePicker
          value={dateValue}
          onChange={(v) => changeDate(v ? new Date(v) : undefined)}
          weekStartsOn={weekStartDay}
          ariaLabel={isPlan ? "Scheduled time" : "Deadline"}
        />
      </div>
    </div>
  );
}
