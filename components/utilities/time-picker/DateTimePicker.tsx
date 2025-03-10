import * as React from "react";
import { add, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { TimePicker } from "@/components/ui/TimePicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/PopOver";
import { TimePickerDemo } from "./TimePickerDemo";

interface DateTimePickerProps {
  date: Date | undefined;
  setDate: React.Dispatch<React.SetStateAction<Date | undefined>>;
  color?: string;
}

export function DateTimePicker({ date, setDate, color }: DateTimePickerProps) {
  const handleSelect = (newDay: Date | undefined) => {
    if (!newDay) return;

    if (!date) {
      setDate(newDay);
      return;
    }

    const diff = newDay.getTime() - date.getTime();
    const diffInDays = diff / (1000 * 60 * 60 * 24);
    const newDateFull = add(date, { days: Math.ceil(diffInDays) });
    setDate(newDateFull);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            `justify-start text-left font-normal text-gray-300 ${
              color ? `text-${color}` : "text-black"
            } bg-transparent border-none shadow-none px-0 hover:bg-transparent hover:text-white`,
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "yyyy-MM-dd HH:mm") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="p-3 border-b border-border">
          <TimePickerDemo setDate={setDate} date={date} />
        </div>
        <TimePicker
          mode="single"
          selected={date}
          onSelect={(d) => handleSelect(d)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
