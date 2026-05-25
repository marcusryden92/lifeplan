import React, { useState, useEffect, useMemo, memo } from "react";
import { DateTimePicker } from "@/components/utilities/time-picker/DateTimePicker";
import type { Planner } from "@/types/prisma";

interface DateTimePickerWrapperProps {
  item: Planner;
  onDateChange: (date: Date | undefined) => void;
}

export const DateTimePickerWrapper = memo(function DateTimePickerWrapper({
  item,
  onDateChange,
}: DateTimePickerWrapperProps) {
  const initialDate = useMemo(() => {
    if (item.plannerType === "plan" && item.starts) {
      return new Date(item.starts);
    }
    if (item.deadline) {
      return new Date(item.deadline);
    }
    return undefined;
  }, [item.plannerType, item.starts, item.deadline]);

  const [date, setDate] = useState<Date | undefined>(initialDate);

  // Only notify parent when date changes (not on initial render)
  const prevDateRef = React.useRef<Date | undefined>(initialDate);
  useEffect(() => {
    if (date?.getTime() !== prevDateRef.current?.getTime()) {
      prevDateRef.current = date;
      onDateChange(date);
    }
  }, [date, onDateChange]);

  return <DateTimePicker date={date} setDate={setDate} />;
});
