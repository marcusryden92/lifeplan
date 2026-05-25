"use client";
import { useState } from "react";
import Calendar from "./components/Calendar";
import CalendarHeader from "./components/CalendarHeader";
import StrategyDebugDashboard from "./components/StrategyDebugDashboard";
import { useCalendarProvider } from "@/context/CalendarProvider";

import { getWeekFirstDate } from "@/utils/calendarUtils";
const CalendarPage = () => {
  const { weekStartDay, manuallyRefreshCalendar } = useCalendarProvider();

  const today = new Date();
  const [initialDate, setInitialDate] = useState<Date>(
    getWeekFirstDate(weekStartDay, today)
  );

  const [hoveredCategoryName, setHoveredCategoryName] = useState<string | null>(
    null
  );
  const [hoveredCategoryColor, setHoveredCategoryColor] = useState<
    string | null
  >(null);

  const handleCategoryHover = (
    categoryName: string | null,
    categoryColor: string | null
  ) => {
    setHoveredCategoryName(categoryName);
    setHoveredCategoryColor(categoryColor);
  };

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
        hoveredCategoryName={hoveredCategoryName}
        hoveredCategoryColor={hoveredCategoryColor}
      />

      <Calendar
        initialDate={initialDate}
        onCategoryHover={handleCategoryHover}
      />
      <StrategyDebugDashboard />
    </div>
  );
};

export default CalendarPage;
