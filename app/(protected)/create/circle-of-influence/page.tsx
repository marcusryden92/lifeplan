"use client";

import { useDataContext } from "@/context/DataContext";
import { CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import {
  FormField,
  Form,
  FormItem,
  FormDescription,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TaskListSchema } from "@/schemas";
import { useState, useRef, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { PencilIcon } from "@heroicons/react/24/outline";
import { TrashIcon } from "@heroicons/react/24/outline";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { ArrowLongLeftIcon } from "@heroicons/react/24/outline";

import { Planner } from "@/lib/plannerClass";

export default function InfluencePage() {
  const { taskArray, setTaskArray } = useDataContext();

  const form = useForm<z.infer<typeof TaskListSchema>>({
    resolver: zodResolver(TaskListSchema),
    defaultValues: {
      title: "",
    },
  });

  const tasksContainerRef = useRef<HTMLDivElement>(null);
  const prevTaskLengthRef = useRef(taskArray.length);

  const onClick = (index: number) => {
    // Update state correctly without mutation

    setTaskArray((prevTaskArray): Planner[] => {
      const updatedTaskArray = prevTaskArray.map((task, i) =>
        i === index ? { ...task, canInfluence: !task.canInfluence } : task
      );
      return updatedTaskArray as Planner[];
    });
  };

  useEffect(() => {
    if (
      tasksContainerRef.current &&
      taskArray.length > prevTaskLengthRef.current
    ) {
      tasksContainerRef.current.scrollLeft =
        tasksContainerRef.current.scrollWidth;
    }
    prevTaskLengthRef.current = taskArray.length;
  }, [taskArray]);

  return (
    <div className="flex flex-col w-full h-full bg-white rounded-xl bg-opacity-95 px-10">
      <CardHeader className="border-b px-0 py-6">
        <p className="text-xl font-semibold">Circle of Influence</p>
        <p className="text-sm">
          Please mark every item which you consider to be within your circle of
          influence.
        </p>
      </CardHeader>

      <div
        className="overflow-x-auto flex-grow flex flex-col items-start justify-start flex-wrap content-start no-scrollbar py-2 space-y-1"
        ref={tasksContainerRef}
      >
        {taskArray.map((task, index) => (
          <div
            key={index}
            className={`flex flex-row items-center rounded-lg w-[250px] group hover:shadow-md py-2 px-4 space-x-3 ${
              task.canInfluence ? " bg-sky-400 text-white" : "bg-transparent"
            }`}
            onClick={() => onClick(index)} // Simplified
          >
            <div className="max-w-[250px] break-words overflow-hidden text-ellipsis text-sm">
              {task.title}
            </div>
          </div>
        ))}
      </div>
      <CardFooter className="flex items-center justify-between flex-shrink p-4 border-t">
        <Button variant={"invisible"} className="px-0">
          <Link href={"/create/"} className="flex group items-center gap-4 ">
            <ArrowLongLeftIcon className="w-9 h-9 text-gray-400 group-hover:text-gray-800 rounded-full" />{" "}
          </Link>
        </Button>
        <Button
          variant={"invisible"}
          disabled={taskArray.length === 0}
          className="px-0"
        >
          <Link
            href={"/create/circle-of-influence"}
            className="flex group items-center gap-4 "
          >
            {" "}
            {"Continue"}
            <CheckCircledIcon className="w-9 h-9 group-hover:bg-emerald-400 rounded-full" />{" "}
          </Link>
        </Button>
      </CardFooter>
    </div>
  );
}
