"use client";

// Third-party libraries
import { useState } from "react";
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
      type: "goal",
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

  const handleSetToGoal = (index: number) => {
    setChangeToTask(index);
  };

  const handleConfirmGoal = (currentDuration: number | undefined) => {
    const finalDuration =
      taskDuration !== undefined ? taskDuration : currentDuration;

    if (changeToTask !== null && finalDuration !== undefined) {
      setTaskArray((prevTasks) =>
        prevTasks.map((task, index) =>
          index === changeToTask
            ? {
                ...task,
                type: "plan",
                deadline: task.deadline || undefined,
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
  };

  return (
    <div className="flex flex-col w-full h-full bg-white rounded-xl bg-opacity-95 px-10">
      <CardHeader className="flex flex-row border-b px-0 py-6 space-x-10 items-center">
        <p className="text-xl font-semibold">CLARIFY GOALS</p>
        <p className="text-sm text-center">Clarify your goals.</p>
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
      <div className="overflow-x-auto flex-grow flex items-start justify-center flex-wrap content-start no-scrollbar py-2 ">
        {taskArray.map((task, index) =>
          task.canInfluence && task.type !== "goal" ? (
            <div
              key={index}
              className={`flex flex-col rounded-lg w-full md:w-1/3 h-full group hover:shadow-md py-1 px-4 my-1 mx-1 bg-red-700 text-white `}
            >
              {/* // TITLE AND NAME EDITOR */}

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
                <div className="flex w-full items-center justify-center border-b border-gray-600 border-opacity-15 pb-1">
                  <div
                    className="flex-grow flex justify-between items-center max-w-[250px] py-2"
                    onClick={() => handleSetToGoal(index)}
                  >
                    <div className=" max-w-[180px]">
                      {task.title.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex flex-row space-x-2 items-center ml-auto transition-opacity">
                    <>
                      <div
                        onClick={() => handleClickEdit(index)}
                        className="cursor-pointer text-gray-400 hover:text-blue-400"
                      >
                        <PencilIcon
                          className={`w-5 h-5 ${
                            task.type === "plan" ? "text-white" : ""
                          }`}
                        />
                      </div>
                      <div
                        onClick={() => handleDeleteTask(index)}
                        className="cursor-pointer text-gray-400 hover:text-red-400"
                      >
                        <XMarkIcon
                          className={`w-7 h-7 ${
                            task.type === "plan" ? "text-white" : ""
                          }`}
                        />
                      </div>
                    </>
                  </div>
                </div>
              )}

              {/* // DATE PICKER */}

              <div className="flex flex-row justify-between items-center space-x-2 border-b border-gray-600 border-opacity-15 pb-1">
                <div className="flex items-center">
                  <span className="mr-10">{"Target date:  "}</span>
                  <DateTimePicker
                    date={selectedDate}
                    setDate={setSelectedDate}
                    color="gray-300"
                  />
                  <XMarkIcon
                    onClick={() => {
                      setTaskArray((prevTasks) =>
                        prevTasks.map((t, i) =>
                          i === index ? { ...t, deadline: undefined } : t
                        )
                      );
                    }}
                    className="cursor-pointer w-6 h-6 text-destructive mr-2"
                  />
                </div>
              </div>

              {/* // SUBTASKS LIST */}

              <div className="flex flex-grow h-full"></div>

              {/* // ADD SUBTASK */}

              <div className="w-full">
                <div className="flex gap-2 items-center">
                  <Input
                    value={""}
                    onChange={() => {}}
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
              </div>

              {/* // CONFIRMATION BUTTON */}

              <div className="flex justify-end justify-self-end space-x-2">
                <button
                  onClick={() => handleConfirmGoal(task.duration)}
                  disabled={taskDuration === undefined}
                  className="text-gray-300 hover:text-white"
                >
                  <CheckCircledIcon className="w-9 h-9 hover:bg-sky-400 rounded-full" />
                </button>
              </div>
            </div>
          ) : null
        )}
      </div>
      <CardFooter className="flex items-center justify-between flex-shrink p-4 border-t">
        <Button variant="invisible" className="px-0">
          <Link
            href={"/create/goals"}
            className="flex group items-center gap-4"
          >
            <ArrowLongLeftIcon className="w-9 h-9 text-gray-400 group-hover:text-gray-800 rounded-full" />
          </Link>
        </Button>
        <Button
          variant="invisible"
          disabled={taskArray.length === 0}
          className="px-0"
        ></Button>
      </CardFooter>
    </div>
  );
}
