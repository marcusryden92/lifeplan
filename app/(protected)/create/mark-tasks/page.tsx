"use client";

import { useDataContext } from "@/context/DataContext";
import { CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import {
  FormField,
  Form,
  FormItem,
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
import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  ArrowLongLeftIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { Planner } from "@/lib/plannerClass";
import { CheckIcon } from "@heroicons/react/24/outline";

export default function CapturePage() {
  const { taskArray, setTaskArray } = useDataContext();
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");

  const [changeToTask, setChangeToTask] = useState<number | null>(null);
  const [taskDuration, setTaskDuration] = useState<number | undefined>(
    undefined
  );

  const form = useForm<z.infer<typeof TaskListSchema>>({
    resolver: zodResolver(TaskListSchema),
    defaultValues: {
      title: "",
    },
  });

  const tasksContainerRef = useRef<HTMLDivElement>(null);
  const prevTaskLengthRef = useRef(taskArray.length);

  // Create a ref for the duration input field
  const durationInputRef = useRef<HTMLInputElement>(null);

  const onSubmit = (values: z.infer<typeof TaskListSchema>) => {
    if (editIndex !== null) {
      setTaskArray((prevTasks) =>
        prevTasks.map((task, index) =>
          index === editIndex ? new Planner(editTitle) : task
        )
      );
      setEditIndex(null);
      setEditTitle("");
    } else {
      const newTask = new Planner(values.title);
      setTaskArray((prevTasks) => [...prevTasks, newTask]);
    }
    form.reset();
  };

  const onClick = (index: number) => {
    setTaskArray((prevTaskArray): Planner[] => {
      const updatedTaskArray = prevTaskArray.map((task, i) =>
        i === index ? { ...task, canInfluence: !task.canInfluence } : task
      );
      return updatedTaskArray as Planner[];
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
          index === editIndex ? { ...task, title: editTitle } : task
        )
      );
      setEditIndex(null);
      setEditTitle("");
    }
  };

  const handleSetToTask = (index: number) => {
    setChangeToTask(index);
    setTaskDuration(undefined); // Reset duration on new selection
  };

  const handleConfirmTask = () => {
    if (changeToTask !== null && taskDuration !== undefined) {
      setTaskArray((prevTasks) =>
        prevTasks.map((task, index) =>
          index === changeToTask
            ? { ...task, type: "task", duration: taskDuration }
            : task
        )
      );
      setChangeToTask(null);
      setTaskDuration(undefined);
    }
  };

  const handleCancelTask = () => {
    if (changeToTask !== null) {
      setTaskArray((prevTasks) =>
        prevTasks.map((task, index) =>
          index === changeToTask
            ? { ...task, type: null, duration: undefined } // Use undefined instead of null
            : task
        )
      );
    }
    setChangeToTask(null);
    setTaskDuration(undefined);
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

  useEffect(() => {
    if (changeToTask !== null) {
      // Use setTimeout to ensure the input field is rendered
      const timer = setTimeout(() => {
        if (durationInputRef.current) {
          durationInputRef.current.focus();
        }
      }, 100); // Adjust the delay if necessary

      // Cleanup the timer if the component unmounts or changeToTask changes
      return () => clearTimeout(timer);
    }
  }, [changeToTask]);

  return (
    <div className="flex flex-col w-full h-full bg-white rounded-xl bg-opacity-95 px-10">
      <CardHeader className="flex flex-row border-b px-0 py-6 space-x-10 items-center">
        <p className="text-xl font-semibold">Tasks</p>
        <p className="text-sm text-center">
          Click to mark all <span className="font-bold">TASKS</span> - items
          without a specific date or time, which only need to happen once.
        </p>
      </CardHeader>
      <CardContent className="px-0 py-6 border-b">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
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
        className="overflow-x-auto flex-grow flex flex-col items-start justify-start flex-wrap content-start no-scrollbar py-2 space-y-1"
        ref={tasksContainerRef}
      >
        {taskArray.map(
          (task, index) =>
            task.canInfluence && (
              <div
                key={index}
                className={`flex flex-row items-center rounded-lg w-[350px] group hover:shadow-md py-1 px-4 space-x-3${
                  task.type === "task" || changeToTask === index
                    ? " bg-orange-400 text-white"
                    : "bg-transparent"
                }`}
              >
                <div className="flex-1">
                  {editIndex === index ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className={`bg-gray-200 bg-opacity-25 border-none m-0 text-sm h-auto ${
                          task.type === "task" ? "text-black" : ""
                        } `}
                      />
                      <Button size="xs" onClick={handleUpdateClick}>
                        Edit
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="flex max-w-[250px] break-words overflow-hidden text-ellipsis text-sm items-start justify-between" // Ensure items are aligned to the top
                      onClick={() => handleSetToTask(index)} // Simplified
                    >
                      <div className="max-w-[150px]">{task.title}</div>
                      {task.type === "task" && changeToTask !== index && (
                        <div className="text-sm text-white pr-2 flex flex-col justify-start">
                          {task.duration}
                          {" min"}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Duration Input Section */}
                {changeToTask === index && (
                  <div className="flex flex-row h-full items-start space-x-2">
                    <div className="flex items-center space-x-2 mr-[-1rem]">
                      <Input
                        ref={durationInputRef} // Attach the ref here
                        value={taskDuration?.toString() || ""}
                        onChange={(e) =>
                          setTaskDuration(Number(e.target.value))
                        }
                        placeholder={
                          taskArray[index].duration?.toString() || "min"
                        }
                        className="w-14 h-7 text-sm text-white "
                        type="number"
                        pattern="[0-9]*"
                      />
                      <button
                        onClick={handleCancelTask}
                        className="text-gray-800 hover:text-white"
                      >
                        <ArrowUturnLeftIcon className="w-5 h-5 p-0" />
                      </button>
                      <button
                        onClick={handleConfirmTask}
                        disabled={taskDuration === undefined}
                        className="text-gray-800 hover:text-white"
                      >
                        <CheckIcon className="w-6 h-6 p-0" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-row space-x-2 items-center opacity-0 group-hover:opacity-100 transition-opacity self-start">
                  {editIndex !== index && changeToTask !== index && (
                    <>
                      <div
                        onClick={() => handleEditClick(index)}
                        className="cursor-pointer text-gray-400 hover:text-blue-400"
                      >
                        <PencilIcon
                          className={`w-5 h-5 ${
                            task.type === "task" ? "text-white" : ""
                          }`}
                        />
                      </div>
                      <div
                        onClick={() => deleteTask(index)}
                        className="cursor-pointer text-gray-400 hover:text-red-400"
                      >
                        <XMarkIcon
                          className={`w-7 h-7 ${
                            task.type === "task" ? "text-white" : ""
                          }`}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
        )}
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
            href={"/create/mark-tasks"}
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
