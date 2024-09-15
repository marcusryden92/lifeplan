"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

import Calendar from "@/components/calendar/calendar";
import { useDataContext } from "@/context/DataContext";
import { SimpleEvent } from "@/utils/calendar-generation";

import { generateCalendar } from "@/utils/calendar-generation";

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
    <div className="w-full h-full bg-white rounded-xl bg-opacity-95 overflow-hidden max-h-[100vh] p-10">
      {/* <CardHeader className="px-0">
        <p className="text-xl font-semibold">Calendar</p>
      </CardHeader> */}
      <CardContent className="flex-grow h-full px-0">
        <Calendar initialEvents={currentCalendar} />
      </CardContent>
    </div>
  );
};

export default CalendarPage;
