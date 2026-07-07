"use client";

import { format } from "date-fns";
import { RotateCcw } from "lucide-react";
import {
  parseRecurrenceExceptions,
  serializeRecurrenceExceptions,
  removeException,
  occurrenceKeyToDate,
  planIsRecurring,
} from "@/utils/planRecurrence";
import { useItem } from "../ItemContext";
import {
  card,
  cardTitle,
  exceptionRow,
  exceptionTime,
  exceptionArrow,
  exceptionSkipped,
  restoreBtn,
} from "./RecurrenceExceptionsCard.css";

const TIME_FORMAT = "EEE MMM d · HH:mm";

export function RecurrenceExceptionsCard() {
  const { item, updateField } = useItem();

  if (item.plannerType !== "plan" || !planIsRecurring(item)) return null;

  const exceptions = parseRecurrenceExceptions(item.recurrenceExceptions);
  if (exceptions.length === 0) return null;

  const sorted = [...exceptions].sort(
    (a, b) =>
      occurrenceKeyToDate(a.key).getTime() - occurrenceKeyToDate(b.key).getTime(),
  );

  const restore = (key: string) => {
    updateField(
      "recurrenceExceptions",
      serializeRecurrenceExceptions(removeException(exceptions, key)),
    );
  };

  return (
    <div className={card}>
      <div className={cardTitle}>Exceptions</div>
      {sorted.map((exception) => (
        <div key={exception.key} className={exceptionRow}>
          <span className={exceptionTime}>
            {format(occurrenceKeyToDate(exception.key), TIME_FORMAT)}
          </span>
          {exception.type === "moved" ? (
            <>
              <span className={exceptionArrow}>→</span>
              <span className={exceptionTime}>
                {format(new Date(exception.newStart), TIME_FORMAT)}
              </span>
            </>
          ) : (
            <span className={exceptionSkipped}>skipped</span>
          )}
          <button
            type="button"
            className={restoreBtn}
            onClick={() => restore(exception.key)}
            title="Remove this exception — the occurrence returns to its regular time"
          >
            <RotateCcw size={11} strokeWidth={2} />
            Restore
          </button>
        </div>
      ))}
    </div>
  );
}
