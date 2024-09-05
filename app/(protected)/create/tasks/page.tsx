"use client";

// Third-party libraries
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import Link from "next/link";
import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  ArrowLongLeftIcon,
  ArrowUturnLeftIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { CheckCircledIcon } from "@radix-ui/react-icons";

// Local components and context
import { useDataContext } from "@/context/DataContext";
import { CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import {
  FormField,
  Form,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/utilities/time-picker/date-time-picker";

// Schemas
import { TaskListSchema } from "@/schemas";

// Local utilities
import {
  onSubmit,
  deleteTask,
  deleteAll,
  clickEdit,
  confirmEdit,
} from "@/utils/creation-pages-functions";

export default function TasksPage() {
  const { taskArray, setTaskArray } = useDataContext();
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [changeToTask, setChangeToTask] = useState<number | null>(null);
  const [taskDuration, setTaskDuration] = useState<number | undefined>(
    undefined
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const tasksContainerRef = useRef<HTMLDivElement>(null);
  const prevTaskLengthRef = useRef(taskArray.length);
  const durationInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof TaskListSchema>>({
    resolver: zodResolver(TaskListSchema),
    defaultValues: {
      title: "",
    },
  });

  const handleFormSubmit = (values: z.infer<typeof TaskListSchema>) => {
    onSubmit({
      values,
      setTaskArray,
      editIndex,
      setEditIndex,
      editTitle,
      setEditTitle,
      form,
      setDefaultInfluence: true,
    });
  };

  const handleDeleteTask = (index: number) => {
    deleteTask(index, {
      setTaskArray,
      editIndex,
      setEditIndex,
      setEditTitle,
    });
  };

  const handleDeleteAll = () => {
    deleteAll({ setTaskArray });
  };

  const handleClickEdit = (index: number) => {
    clickEdit({
      index,
      setEditIndex,
      setEditTitle,
      taskArray,
    });
  };

  const handleConfirmEdit = () => {
    confirmEdit({
      editIndex,
      editTitle,
      setTaskArray,
      setEditIndex,
      setEditTitle,
    });
  };

  const handleSetToTask = (index: number) => {
    setChangeToTask(index);
    setTaskDuration(taskArray[index].duration || undefined);
    setSelectedDate(taskArray[index].deadline || undefined);
  };

  const handleConfirmTask = (currentDuration: number | undefined) => {
    const finalDuration =
      taskDuration !== undefined ? taskDuration : currentDuration;

    if (changeToTask !== null && finalDuration !== undefined) {
      setTaskArray((prevTasks) =>
        prevTasks.map((task, index) =>
          index === changeToTask
            ? {
                ...task,
                type: "task",
                duration: finalDuration,
                deadline: selectedDate || undefined,
              }
            : task
        )
      );
      resetTaskState();
    }
  };

  const handleCancelTask = () => {
    if (changeToTask !== null) {
      setTaskArray((prevTasks) =>
        prevTasks.map((task, index) =>
          index === changeToTask
            ? { ...task, type: null, duration: undefined }
            : task
        )
      );
    }
    resetTaskState();
  };

  const resetTaskState = () => {
    setChangeToTask(null);
    setTaskDuration(undefined);
    setSelectedDate(undefined);
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
      const timer = setTimeout(() => {
        durationInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [changeToTask]);

  return (
    <div className="flex flex-col w-full h-full bg-white rounded-xl bg-opacity-95 px-10">
      <CardHeader className="flex flex-row border-b px-0 py-6 space-x-10 items-center">
        <p className="text-xl font-semibold">TASKS</p>
        <p className="text-sm text-center">
          Click to mark all <span className="font-bold">TASKS</span> - items
          without a specific date or time, which only need to happen once.
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
                      onClick={handleDeleteAll}
                      className="flex bg-none text-gray-400 hover:text-red-500 text-[0.9rem]"
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
        className="overflow-x-auto flex-grow flex flex-col items-start justify-start flex-wrap content-start no-scrollbar py-2"
        ref={tasksContainerRef}
      >
        {taskArray.map((task, index) =>
          task.canInfluence ? (
            <div
              key={index}
              className={`flex flex-col rounded-lg w-[350px] group hover:shadow-md py-1 px-4 my-1 mx-1 ${
                task.type === "task" || changeToTask === index
                  ? "bg-amber-500 text-white"
                  : "bg-transparent"
              }`}
            >
              {/* Duration Input Section */}
              {changeToTask === index && (
                <div className="flex flex-row justify-between items-center space-x-2 border-b border-gray-600 border-opacity-15 pb-1">
                  <div className="flex items-center">
                    <XMarkIcon
                      onClick={() => setSelectedDate(undefined)}
                      className="cursor-pointer w-6 h-6 text-destructive mr-2"
                    />
                    <DateTimePicker
                      date={selectedDate}
                      setDate={setSelectedDate}
                    />
                  </div>
                  <Input
                    ref={durationInputRef}
                    defaultValue={taskArray[index].duration}
                    onChange={(e) => setTaskDuration(Number(e.target.value))}
                    placeholder={taskArray[index].duration?.toString() || "min"}
                    className="w-14 h-7 text-sm text-white"
                    type="number"
                    pattern="[0-9]*"
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCancelTask}
                      className="text-gray-800 hover:text-white"
                    >
                      <ArrowUturnLeftIcon className="w-5 h-5 p-0" />
                    </button>
                    <button
                      onClick={() => handleConfirmTask(index)}
                      disabled={taskDuration === undefined}
                      className="text-gray-800 hover:text-white"
                    >
                      <CheckIcon className="w-6 h-6 p-0" />
                    </button>
                  </div>
                </div>
              )}

              {editIndex === index ? (
                <div className="flex gap-2 items-center">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className={`bg-gray-200 bg-opacity-25 border-none m-0 text-sm h-auto ${
                      task.canInfluence ? "text-black" : ""
                    }`}
                  />
                  <Button
                    size="xs"
                    variant="invisible"
                    onClick={handleConfirmEdit}
                  >
                    <CheckIcon className="w-6 h-6 p-0 bg-none text-sky-500 hover:opacity-50" />
                  </Button>
                </div>
              ) : (
                <div className="flex w-full items-center justify-center">
                  <div
                    className="flex-grow flex justify-between max-w-[250px] break-words overflow-hidden text-ellipsis text-sm py-2"
                    onClick={() => handleSetToTask(index)}
                  >
                    <div className="max-w-[180px]">{task.title}</div>
                    {task.type === "task" && changeToTask !== index && (
                      <div className="text-sm text-white pl-2 flex items-start justify-start space-x-2">
                        <div>
                          {" "}
                          {task.deadline && format(task.deadline, "yyyy-MM-dd")}
                        </div>
                        <div>
                          {task.duration} {" min"}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-row space-x-2 items-center ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    {editIndex !== index && changeToTask !== index && (
                      <>
                        <div
                          onClick={() => handleClickEdit(index)}
                          className="cursor-pointer text-gray-400 hover:text-blue-400"
                        >
                          <PencilIcon
                            className={`w-5 h-5 ${
                              task.type === "task" ? "text-white" : ""
                            }`}
                          />
                        </div>
                        <div
                          onClick={() => handleDeleteTask(index)}
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
              )}
            </div>
          ) : null
        )}
      </div>
      <CardFooter className="flex items-center justify-between flex-shrink p-4 border-t">
        <Button variant="invisible" className="px-0">
          <Link
            href={"/create/influence"}
            className="flex group items-center gap-4"
          >
            <ArrowLongLeftIcon className="w-9 h-9 text-gray-400 group-hover:text-gray-800 rounded-full" />
          </Link>
        </Button>
        <Button
          variant="invisible"
          disabled={taskArray.length === 0}
          className="px-0"
        >
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
