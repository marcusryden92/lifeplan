"use client";
import { useState } from "react";
import Calendar from "./components/Calendar";
import CalendarHeader from "./components/CalendarHeader";
import { useDataContext } from "@/context/DataContext";

import { getWeekFirstDate } from "@/utils/calendarUtils";
const CalendarPage = () => {
  const { currentCalendar, weekStartDay, manuallyUpdateCalendar } =
    useDataContext();

  const today = new Date();
  const [initialDate, setInitialDate] = useState<Date>(
    getWeekFirstDate(weekStartDay, today)
  );

  const resetCalendar = () => {
    setInitialDate(getWeekFirstDate(weekStartDay, today));
  };

  return (
    <div className="flex flex-col h-full w-full bg-opacity-95 lg:overflow-hidden max-h-[100vh] lg:mr-5 lg:border-r-[1px]  lg:border-[rgba(128, 128, 128, 0.3)]">
      <CalendarHeader
        initialDate={initialDate}
        setInitialDate={setInitialDate}
        resetCalendar={resetCalendar}
        manuallyUpdateCalendar={manuallyUpdateCalendar}
      />

      <Calendar initialEvents={currentCalendar} initialDate={initialDate} />
    </div>
  );
};

export default CalendarPage;
