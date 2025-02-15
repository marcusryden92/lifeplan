"use client";

import { useState } from "react";
import { CardHeader } from "@/components/ui/Card";
import { TrashIcon } from "@heroicons/react/24/outline";

import TemplateBuilder from "./_components/TemplateBuilder";
import { useDataContext } from "@/context/DataContext";
import { SimpleEvent } from "@/utils/calendar-generation/calendarGeneration";

export default function TasksPage() {
  const [templateEvents, setTemplateEvents] = useState<SimpleEvent[]>([]); // State to manage events

  const { setCurrentTemplate } = useDataContext();

  const handleDeleteAll = () => {
    setCurrentTemplate([]);
    setTemplateEvents([]);
  };
  return (
    <div className="flex flex-col w-full h-full bg-opacity-95 pt-2">
      <CardHeader className="flex flex-row border-b pb-6 pt-8 px-10 space-x-10 items-center justify-between">
        <p className="text-xl font-semibold">WEEK TEMPLATE</p>
        <button
          type="button"
          onClick={handleDeleteAll}
          className="flex bg-none text-gray-400 hover:text-red-500 text-[0.9rem]"
        >
          <TrashIcon className="w-5 h-5 mx-2" />
          Delete all
        </button>
      </CardHeader>
      <TemplateBuilder
        templateEvents={templateEvents}
        setTemplateEvents={setTemplateEvents}
      />
    </div>
  );
}
