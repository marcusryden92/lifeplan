"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLongLeftIcon, TrashIcon } from "@heroicons/react/24/outline";

import TemplateBuilder from "@/components/template-builder/template-builder";
import { useDataContext } from "@/context/DataContext";

export default function TasksPage() {
  const { setCurrentTemplate, setTemplateEvents } = useDataContext();

  const handleDeleteAll = () => {
    setCurrentTemplate([]);
    // setTemplateEvents([]);
  };
  return (
    <div className="flex flex-col w-full h-full bg-white rounded-xl bg-opacity-95 px-10">
      <CardHeader className="flex flex-row border-b px-0 py-6 space-x-10 items-center justify-between">
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
      <CardContent className="flex-grow h-full">
        <TemplateBuilder />
      </CardContent>
      <CardFooter className="flex items-center justify-between flex-shrink p-4 border-t">
        <Button variant="invisible" className="px-0">
          <Link
            href={"/create/influence"}
            className="flex group items-center gap-4"
          >
            <ArrowLongLeftIcon className="w-9 h-9 text-gray-400 group-hover:text-gray-800 rounded-full" />
          </Link>
        </Button>
        <Button variant="invisible" className="px-0">
          <Link
            href={"/create/plans"}
            className="flex group items-center gap-4"
          >
            {"Continue"}
            <CheckCircledIcon className="w-9 h-9 group-hover:bg-emerald-400 rounded-full" />
          </Link>
        </Button>
      </CardFooter>
    </div>
  );
}
