"use client";

import { useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";

import TemplateBuilder from "./_components/TemplateBuilder";
import { useDataContext } from "@/context/DataContext";
import { SimpleEvent } from "@/types/calendarTypes";

export default function TasksPage() {
  const [templateEvents, setTemplateEvents] = useState<SimpleEvent[]>([]); // State to manage events

  const { setCurrentTemplate } = useDataContext();

  const handleDeleteAll = () => {
    setCurrentTemplate([]);
    setTemplateEvents([]);
  };
  return (
    <div className="flex flex-col w-full h-full bg-opacity-95">
      <header className="flex w-full h-20 p-8 items-center justify-between bg-white shadow-md rounded-lg border-t-2 border-gray-300">
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

      <TemplateBuilder
        templateEvents={templateEvents}
        setTemplateEvents={setTemplateEvents}
      />
    </div>
  );
}
