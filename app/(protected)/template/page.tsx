"use client";

import { TrashIcon } from "@heroicons/react/24/outline";

import TemplateBuilder from "./_components/TemplateBuilder";
import { useCalendarProvider } from "@/context/CalendarProvider";
import headerStyles from "../calendar/components/CalendarHeader.module.css";

export default function TasksPage() {
  const { updateTemplateArray } = useCalendarProvider();

  const handleDeleteAll = () => {
    updateTemplateArray([]);
  };

  return (
    <div className="flex flex-col w-full h-full bg-opacity-95">
      <header className={headerStyles.headerContainer}>
        <span className="flex-1 text-lg font-medium text-gray-700">
          Week Template
        </span>

        <button
          type="button"
          onClick={handleDeleteAll}
          className="mr-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200 flex items-center"
        >
          <TrashIcon className="w-5 h-5 mx-2" />
          Delete all
        </button>
      </header>

      <TemplateBuilder />
    </div>
  );
}
