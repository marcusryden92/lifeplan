import React, { useMemo } from "react";
import { shiftDate } from "@/utils/calendarUtils";
import { Button } from "@/components/ui/Button";
import { ChevronRightIcon, ChevronLeftIcon } from "lucide-react";

import { getCalendarHeaderDateString } from "@/utils/calendarUtils";

import styles from "./CalendarHeader.module.css";

const CalendarHeader = ({
  initialDate,
  setInitialDate,
  reupdateCalendarArray,
  manuallyRefreshCalendar,
}: {
  initialDate: Date;
  setInitialDate: React.Dispatch<React.SetStateAction<Date>>;
  reupdateCalendarArray: () => void;
  manuallyRefreshCalendar: () => void;
}) => {
  const monthArray = useMemo(
    () => [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    []
  );

  const finalDate = useMemo(() => shiftDate(initialDate, 6), [initialDate]);

  // Get the formatted date string using the helper function
  const dateString = getCalendarHeaderDateString(
    initialDate,
    finalDate,
    monthArray
  );

  const decrementWeek = () => {
    setInitialDate((prev) => shiftDate(prev, -7));
  };

  const incrementWeek = () => {
    setInitialDate((prev) => shiftDate(prev, 7));
  };

  return (
    <header className={styles.headerContainer}>
      <span className="flex-1 text-lg font-medium text-gray-700">
        Calendar: {dateString}
      </span>
      {/* Centered Refresh Button */}
      <div className="flex-1 flex justify-center">
        <Button
          variant={"outline"}
          onClick={() => {
            manuallyRefreshCalendar();
          }}
          className="rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200"
        >
          Refresh Calendar
        </Button>
      </div>
      {/* Right-aligned Navigation */}
      <span className="flex-1 flex justify-end space-x-2">
        <Button
          variant={"outline"}
          onClick={reupdateCalendarArray}
          className="mr-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200"
        >
          Today
        </Button>
        <Button
          onClick={decrementWeek}
          variant={"ghost"}
          className="rounded-full text-gray-600 hover:bg-gray-100 transition-colors duration-200"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </Button>
        <Button
          onClick={incrementWeek}
          variant={"ghost"}
          className="rounded-full text-gray-600 hover:bg-gray-100 transition-colors duration-200"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </Button>
      </span>
    </header>
  );
};

export default CalendarHeader;
