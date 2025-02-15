"use client";

import { useEffect, useState } from "react";

import Calendar from "./components/Calendar";
import { useDataContext } from "@/context/DataContext";
import { SimpleEvent } from "@/utils/calendar-generation/calendarGeneration";

import { generateCalendar } from "@/utils/calendar-generation/calendarGeneration";

const CalendarPage = () => {
  const { currentTemplate, weekStartDay, taskArray } = useDataContext();

  const [currentCalendar, setCurrentCalendar] = useState<
    SimpleEvent[] | undefined
  >([]);

  useEffect(() => {
    if (currentTemplate && currentTemplate.length > 0 && taskArray) {
      const newCalendar = generateCalendar(
        weekStartDay,
        currentTemplate,
        taskArray
      );
      setCurrentCalendar(newCalendar);
    } else {
      console.log("Trouble fetching");
    }
  }, [taskArray]);

  return (
    <div className=" h-full  bg-opacity-95 lg:overflow-hidden max-h-[100vh] lg:mr-5 lg:border-r-[1px]  lg:border-[rgba(128, 128, 128, 0.3)]">
      <Calendar initialEvents={currentCalendar} />
    </div>
  );
};

export default CalendarPage;
