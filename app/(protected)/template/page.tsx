"use client";

import Link from "next/link";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLongLeftIcon } from "@heroicons/react/24/outline";

import TemplateBuilder from "@/components/template-builder/template-builder";

export default function TasksPage() {
  return (
    <div className="flex flex-col w-full h-full bg-white rounded-xl bg-opacity-95 px-10">
      <CardHeader className="flex flex-row border-b px-0 py-6 space-x-10 items-center">
        <p className="text-xl font-semibold">WEEK TEMPLATE</p>
        <p className="text-sm text-center">
          Click to mark all <span className="font-bold">TASKS</span> - items
          without a specific date or time, which only need to happen once.
        </p>
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
