"use client";

import Calendar from "./components/Calendar";
import { useDataContext } from "@/context/DataContext";
import { Button } from "@/components/ui/Button";

const CalendarPage = () => {
  const { currentCalendar, updateCalendar } = useDataContext();

  return (
    <div className="flex flex-col h-full w-full bg-opacity-95 lg:overflow-hidden max-h-[100vh] lg:mr-5 lg:border-r-[1px]  lg:border-[rgba(128, 128, 128, 0.3)]">
      <Button
        onClick={updateCalendar}
        size="xl"
        className=" m-5 ml-auto bg-sky-600"
      >
        Update
      </Button>
      <Calendar initialEvents={currentCalendar} />
    </div>
  );
};

export default CalendarPage;
