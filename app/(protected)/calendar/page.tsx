"use client";
import { useState } from "react";
import Calendar from "./components/Calendar";
import CalendarHeader from "./components/CalendarHeader";
import { useCalendarProvider } from "@/context/CalendarProvider";

import { getWeekFirstDate } from "@/utils/calendarUtils";
const CalendarPage = () => {
  const { calendar, weekStartDay, manuallyRefreshCalendar } =
    useCalendarProvider();

  const today = new Date();
  const [initialDate, setInitialDate] = useState<Date>(
    getWeekFirstDate(weekStartDay, today)
  );

  const reupdateCalendarArray = () => {
    setInitialDate(getWeekFirstDate(weekStartDay, today));
  };

  return (
    <div className="flex flex-col h-full w-full bg-opacity-95 lg:overflow-hidden max-h-[100vh] lg:mr-5 lg:border-r-[1px]  lg:border-[rgba(128, 128, 128, 0.3)]">
      <CalendarHeader
        initialDate={initialDate}
        setInitialDate={setInitialDate}
        reupdateCalendarArray={reupdateCalendarArray}
        manuallyRefreshCalendar={manuallyRefreshCalendar}
      />

      <Calendar initialEvents={calendar} initialDate={initialDate} />
    </div>
  );
};

export default CalendarPage;
