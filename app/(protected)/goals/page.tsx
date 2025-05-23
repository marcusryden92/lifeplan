"use client";

// Third-party libraries
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import {
  FormField,
  Form,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// Schemas and utilities
import { TaskListSchema } from "@/schemas";
import { Planner } from "@/lib/plannerClass";
import {
  onSubmit,
  deleteTask,
  deleteAll,
  clickEdit,
  confirmEdit,
} from "@/utils/creationPagesFunctions";

export default function InfluencePage() {
  const { mainPlanner, setMainPlanner } = useDataContext();
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const tasksContainerRef = useRef<HTMLDivElement>(null);
  const prevTaskLengthRef = useRef(mainPlanner.length);

  const form = useForm<z.infer<typeof TaskListSchema>>({
    resolver: zodResolver(TaskListSchema),
    defaultValues: {
      title: "",
    },
  });

  const handleFormSubmit = (values: z.infer<typeof TaskListSchema>) => {
    onSubmit({
      values,
      setMainPlanner,
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
      setMainPlanner,
      editIndex,
      setEditIndex,
      setEditTitle,
    });
  };

  const handleDeleteAll = () => {
    const filterArray: Planner[] = mainPlanner.filter(
      (task) => task.type !== "task" && task.type !== "plan" && !task.parentId
    );

    deleteAll({ setMainPlanner, filter: filterArray });
  };

  const handleClickEdit = (index: number) => {
    clickEdit({
      index,
      setEditIndex,
      setEditTitle,
      mainPlanner,
    });
  };

  const handleConfirmEdit = () => {
    confirmEdit({
      editIndex,
      editTitle,
      setMainPlanner,
      setEditIndex,
      setEditTitle,
    });
  };

  const toggleGoal = (index: number) => {
    setMainPlanner((prevTaskArray) =>
      prevTaskArray.map((task, i) =>
        i === index
          ? { ...task, type: task.type !== "goal" ? "goal" : null }
          : task
      )
    );
  };

  useEffect(() => {
    if (
      tasksContainerRef.current &&
      mainPlanner.length > prevTaskLengthRef.current
    ) {
      tasksContainerRef.current.scrollLeft =
        tasksContainerRef.current.scrollWidth;
    }
    prevTaskLengthRef.current = mainPlanner.length;
  }, [mainPlanner]);

  return (
    <div className="pageContainer">
      <CardHeader className="flex flex-row border-b px-0 py-6 space-x-10 items-center">
        <p className="text-xl font-semibold">GOALS</p>
        <p className="text-sm text-center">
          Mark all long-term <span className="font-bold">GOALS</span> - complex
          items that contain several interdependent tasks.
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
        {mainPlanner.map(
          (task, index) =>
            task.type !== "task" &&
            task.type !== "plan" &&
            !task.parentId && (
              <div
                key={index}
                className={`flex flex-row items-center rounded-lg w-[350px] group hover:shadow-md py-1 my-1 mx-1 px-4 space-x-3 ${
                  task.type === "goal"
                    ? "bg-red-700 text-white"
                    : "bg-transparent"
                }`}
              >
                <div className="flex-1">
                  {editIndex === index ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className={`bg-gray-200 bg-opacity-25 border-none m-0 text-sm h-auto `}
                      />
                      <Button
                        variant="invisible"
                        size="xs"
                        onClick={handleConfirmEdit}
                      >
                        <CheckIcon className="w-6 h-6 p-0 bg-none text-gray-300 hover:text-white" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="max-w-[250px] break-words overflow-hidden text-ellipsis text-sm"
                      onClick={() => toggleGoal(index)} // Simplified function name
                    >
                      {task.title}
                    </div>
                  )}
                </div>
                <div className="flex flex-row space-x-2 items-center opacity-0 group-hover:opacity-100 transition-opacity self-start">
                  {editIndex !== index && (
                    <div
                      onClick={() => handleClickEdit(index)}
                      className="cursor-pointer text-gray-400 hover:text-blue-400"
                    >
                      <PencilIcon className={`w-5 h-5 `} />
                    </div>
                  )}
                  <div
                    onClick={() => handleDeleteTask(index)}
                    className="cursor-pointer text-gray-400 hover:text-red-400"
                  >
                    <XMarkIcon className={`w-7 h-7 `} />
                  </div>
                </div>
              </div>
            )
        )}
      </div>
      <CardFooter className="flex items-center justify-between flex-shrink p-4 border-t">
        <Button variant="invisible" className="px-0">
          <Link href={"/plans"} className="flex group items-center gap-4">
            <ArrowLongLeftIcon className="w-9 h-9 text-gray-400 group-hover:text-gray-800 rounded-full" />
          </Link>
        </Button>
        <Button
          variant="invisible"
          disabled={mainPlanner.length === 0}
          className={`px-0`}
        >
          <Link href={"/refine"} className="flex group items-center gap-4">
            {"Continue"}
            <CheckCircledIcon className="w-9 h-9 group-hover:bg-emerald-400 rounded-full" />
          </Link>
        </Button>
      </CardFooter>
    </div>
  );
}
