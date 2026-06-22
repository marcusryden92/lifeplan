"use client";

import { type ChangeEvent } from "react";
import { X } from "lucide-react";
import { format } from "date-fns";
import { Caption } from "@/components/ui";
import { formatDatetimeLocal } from "@/utils/datetime";
import { useItem } from "../../ItemContext";
import {
  fieldStack,
  fieldLabel,
  dateInput,
  dateInputWrap,
  dateClearBtn,
} from "./DateSection.css";

export function DateSection() {
  const { item, changeDate } = useItem();
  const isPlan = item.plannerType === "plan";
  const isoValue = isPlan ? item.starts : item.deadline;
  const dateValue = formatDatetimeLocal(isoValue);

  const onDateInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    changeDate(v ? new Date(v) : undefined);
  };

  return (
    <div className={fieldStack}>
      <span className={fieldLabel}>{isPlan ? "Scheduled" : "Deadline"}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div className={dateInputWrap}>
          <input
            type="datetime-local"
            className={dateInput}
            value={dateValue}
            onChange={onDateInputChange}
          />
          {dateValue && (
            <button
              type="button"
              className={dateClearBtn}
              onClick={() => changeDate(undefined)}
              aria-label={isPlan ? "Clear scheduled time" : "Clear deadline"}
            >
              <X size={12} strokeWidth={2.4} />
            </button>
          )}
        </div>
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
