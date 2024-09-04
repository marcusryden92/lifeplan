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
import { Planner } from "@/lib/plannerClass";

import { onSubmit } from "@/utils/creation-pages-functions";

export default function CapturePage() {
  const { taskArray, setTaskArray } = useDataContext();
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");

  const form = useForm<z.infer<typeof TaskListSchema>>({
    resolver: zodResolver(TaskListSchema),
    defaultValues: {
      title: "",
    },
  });

  const tasksContainerRef = useRef<HTMLDivElement>(null);
  const prevTaskLengthRef = useRef(taskArray.length);

  const handleFormSubmit = (values: z.infer<typeof TaskListSchema>) => {
    onSubmit({
      values,
      setTaskArray,
      editIndex,
      setEditIndex,
      editTitle,
      setEditTitle,
      form,
    });
  };

  const deleteTask = (index: number) => {
    setTaskArray((prevTasks) => prevTasks.filter((_, i) => i !== index));
    if (editIndex === index) {
      setEditIndex(null);
      setEditTitle("");
    }
  };

  const deleteAll = () => {
    setTaskArray([]);
  };

  const handleEditClick = (index: number) => {
    setEditIndex(index);
    setEditTitle(taskArray[index].title);
  };

  const handleUpdateClick = () => {
    if (editIndex !== null) {
      setTaskArray((prevTasks) =>
        prevTasks.map((task, index) =>
          index === editIndex ? new Planner(editTitle) : task
        )
      );
      setEditIndex(null);
      setEditTitle("");
    }
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
      <CardHeader className="flex flex-row border-b px-0 py-6 space-x-10 items-center">
        <p className="text-xl font-semibold">Capture</p>
        <p className="text-sm text-center">
          Write down everything that&apos;s on your mind.
        </p>
      </CardHeader>
      <CardContent className="px-0 py-6 border-b">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-8 flex flex-col"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-5 justify-between">
                    <div className="flex flex-1 gap-5 max-w-[350px]">
                      <FormControl>
                        <Input {...field} placeholder="Task name" />
                      </FormControl>
                      <Button type="submit">Add item</Button>
                    </div>
                    <button
                      type="button"
                      onClick={deleteAll}
                      className="flex bg-none text-gray-400 hover:text-red-500 text-[0.9rem] "
                    >
                      <TrashIcon className="w-5 h-5 mx-2" />
                      Delete all
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
      <div
        className="overflow-x-auto  flex-grow flex flex-col items-start justify-start flex-wrap content-start no-scrollbar py-2"
        ref={tasksContainerRef}
      >
        {taskArray.map((task, index) => (
          <div
            key={index}
            className="flex flex-row items-center rounded-lg w-[350px] group hover:shadow-md py-1 px-4 space-x-3"
          >
            <div className="flex-1">
              {editIndex === index ? (
                <div className="flex gap-2 items-center">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="bg-gray-200 border-none m-0 text-sm h-auto"
                  />
                  <Button size="xs" onClick={handleUpdateClick}>
                    Edit
                  </Button>
                </div>
              ) : (
                <div className="max-w-[250px] break-words overflow-hidden text-ellipsis text-sm">
                  {task.title}
                </div>
              )}
            </div>
            <div className="flex flex-row space-x-2 items-center opacity-0 group-hover:opacity-100 transition-opacity self-start">
              {editIndex !== index && (
                <div
                  onClick={() => handleEditClick(index)}
                  className="cursor-pointer text-gray-400 hover:text-blue-400"
                >
                  <PencilIcon className="w-5 h-5" />
                </div>
              )}
              <div
                onClick={() => deleteTask(index)}
                className="cursor-pointer text-gray-400 hover:text-red-400"
              >
                <XMarkIcon className="w-7 h-7" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <CardFooter className="flex items-center justify-end flex-shrink p-4 border-t">
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
