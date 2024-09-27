"use client";

// Third-party libraries
import { useState, useRef, useEffect, createRef } from "react";
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

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import TaskList from "./components/task-list";
// Local components and context
import { useDataContext } from "@/context/DataContext";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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
import { Planner } from "@/lib/planner-class";

import {
  totalSubtaskDuration,
  formatMinutesToHours,
} from "@/utils/task-array-utils";

export default function TasksPage() {
  const { taskArray, setTaskArray } = useDataContext();
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [changeToTask, setChangeToTask] = useState<number | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const [taskDuration, setTaskDuration] = useState<number | undefined>(
    undefined
  );
  const [taskTitle, setTaskTitle] = useState<string>("");

  const refs = useRef(new Map<number, React.RefObject<HTMLInputElement>>());

  const getRef = (index: number) => {
    if (!refs.current.has(index)) {
      refs.current.set(index, createRef());
    }
    return refs.current.get(index);
  };

  const durationRef = useRef<HTMLInputElement>(null);

  const [carouselIndex, setCarouselIndex] = useState<number | undefined>(
    undefined
  );

  const [goalComplete, setGoalComplete] = useState<boolean>(false);

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

  const handleAddSubtask = (index: number) => {
    if (taskDuration !== undefined && taskTitle) {
      const newTask = new Planner(
        taskTitle,
        taskArray[index].id,
        "goal",
        true,
        taskDuration
      );

      setTaskArray((prevTasks) => [...prevTasks, newTask]); // Spread prevTasks and add newTask

      resetTaskState();
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent default Enter key behavior (e.g., form submission)
      handleAddSubtask(index); // Call handleAddSubtask
      const ref = getRef(index);
      if (ref?.current) {
        ref.current.focus(); // Focus on the correct taskTitle input field
      }
    }
  };

  const handleDeleteTaskById = (taskId: string) => {
    setTaskArray(
      (prevTasks) => prevTasks.filter((task) => task.id !== taskId) // Filter out the task with the matching id
    );
  };

  const resetTaskState = () => {
    setChangeToTask(null);
    setTaskDuration(undefined);
    setTaskTitle("");
  };

  const getCurrentGoal = (index: number) => {
    const goalsList: Planner[] = [];

    taskArray.forEach((task) => {
      if (task.type === "goal") {
        goalsList.push(task);
      }
    });

    const currentGoal = goalsList[index];

    return currentGoal;
  };

  const getGoalsList = () => {
    const goalsList: Planner[] = [];

    taskArray.forEach((task) => {
      if (task.type === "goal" && !task.parentId) {
        goalsList.push(task);
      }
    });

    return goalsList;
  };

  const checkGoalCompletion = (index: number): boolean => {
    // const currentGoal = getCurrentGoal(index);

    const currentGoal = taskArray[index];

    const subtasks = getSubtasksFromId(taskArray[index].id);

    // Check if currentTask is undefined or null
    if (
      // selectedDate != undefined &&
      currentGoal &&
      subtasks &&
      subtasks.length > 1 &&
      currentGoal.deadline != undefined
    ) {
      return true;
    }

    return false;
  };

  const checkTotalCompletion = () => {
    const goalsList = getGoalsList();
    let isComplete = true;

    goalsList.forEach((goal) => {
      if (!goal) {
        return false;
      }

      const subtasks = getSubtasksFromId(goal.id);

      if (
        // selectedDate != undefined &&
        !subtasks ||
        subtasks.length < 2 ||
        goal.deadline === undefined
      ) {
        isComplete = false;
      }
    });

    return isComplete;
  };

  useEffect(() => {
    if (carouselIndex != undefined) {
      const currentGoal = getCurrentGoal(carouselIndex);

      if (currentGoal) {
        const currentId = currentGoal.id;

        setTaskArray((prevArray) =>
          prevArray.map((task, j) =>
            task.id === currentId ? { ...task, deadline: selectedDate } : task
          )
        );
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    if (carouselIndex != undefined) {
      setGoalComplete(checkGoalCompletion(carouselIndex));
    }
  }, [carouselIndex, taskArray]);

  useEffect(() => {
    if (carouselIndex != undefined) {
      const currentGoal = getCurrentGoal(carouselIndex);

      if (currentGoal && currentGoal.deadline) {
        setSelectedDate(currentGoal.deadline);
      } else {
        setSelectedDate(undefined);
      }
    }
  }, [carouselIndex]);

  function getSubtasksFromId(id: string) {
    let subtasksArray: Planner[] = [];

    taskArray.forEach((task) => {
      if (task.parentId === id) {
        subtasksArray.push(task);
      }
    });

    return subtasksArray;
  }

  return (
    <div className="flex flex-col lg:overflow-hidden w-full h-full   bg-opacity-95 px-10">
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

      <div className="overflow-x-auto py-5 flex-grow flex items-start justify-center flex-wrap content-start no-scrollbar ">
        <Carousel
          className="w-1/2 h-full"
          onIndexChange={(currentIndex: number | undefined) => {
            setCarouselIndex(currentIndex);
          }}
        >
          <CarouselContent className="h-full">
            {taskArray.map((task, index) =>
              task.canInfluence && task.type === "goal" && !task.parentId ? (
                <CarouselItem key={index}>
                  <div
                    key={index}
                    className={`flex flex-col border-x border-gray-200   w-full h-full group hover:shadow-md px-8 py-4  transition-colors duration-300 ${
                      checkGoalCompletion(index) ? "bg-emerald-500" : ""
                    }  text-black`}
                  >
                    <>
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
                            <CheckIcon
                              className={`w-6 h-6 p-0 bg-none text-sky-500 hover:opacity-50`}
                            />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex w-full items-center justify-center border-b border-gray-600 border-opacity-15 pb-1">
                          <div
                            className="flex-grow flex justify-between items-center max-w-[250px]"
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
                                    task.type === "goal" ? "text-black" : ""
                                  }`}
                                />
                              </div>
                              <div
                                onClick={() => handleDeleteTask(index)}
                                className="cursor-pointer text-gray-400 hover:text-red-400"
                              >
                                <XMarkIcon
                                  className={`w-7 h-7 ${
                                    task.type === "goal" ? "text-black" : ""
                                  }`}
                                />
                              </div>
                            </>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-row  justify-between items-center space-x-2 border-b border-gray-600 border-opacity-15 pb-1">
                        <div className="flex w-full justify-between items-center">
                          <span className="min-w-24 text-sm">
                            {"Total duration:  " +
                              formatMinutesToHours(
                                totalSubtaskDuration(task.id, taskArray)
                              )}
                          </span>
                        </div>
                      </div>

                      {/* // DATE PICKER */}

                      <div className="flex flex-row  justify-between items-center space-x-2 border-b border-gray-600 border-opacity-15 pb-1">
                        <div className="flex w-full justify-between items-center">
                          <span className="min-w-24 text-sm">
                            {"Target date:  "}
                          </span>
                          <div className="flex items-center space-x-2">
                            <DateTimePicker
                              date={selectedDate}
                              setDate={setSelectedDate}
                              color="gray-300"
                            />
                            <XMarkIcon
                              onClick={() => {
                                setTaskArray((prevTasks) =>
                                  prevTasks.map((t, i) =>
                                    i === index
                                      ? { ...t, deadline: undefined }
                                      : t
                                  )
                                );

                                setSelectedDate(undefined);
                              }}
                              className="cursor-pointer w-6 h-6 text-destructive"
                            />
                          </div>
                        </div>
                      </div>

                      {/* // SUBTASKS LIST */}

                      <div className="flex overflow-y-scroll w-full no-scrollbar flex-grow">
                        <TaskList id={task.id} />
                      </div>

                      {/* // ADD SUBTASK */}

                      <div className="w-full my-2 ">
                        <div className="flex gap-2 items-center">
                          <Input
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            className={`bg-gray-200 bg-opacity-25 border-none m-0 text-sm h-auto ${
                              task.canInfluence ? "text-black" : ""
                            }`}
                            ref={getRef(index)} // Attach ref dynamically
                          />
                          <Input
                            value={taskDuration || ""} // Ensure it's always a string
                            onChange={(e) =>
                              setTaskDuration(Number(e.target.value))
                            }
                            placeholder={
                              taskArray[index].duration?.toString() || "min"
                            }
                            className="w-14 h-7 text-sm text-black"
                            type="number"
                            pattern="[0-9]*"
                            ref={durationRef} // Attach ref to the duration input
                            onKeyDown={(e) => handleKeyDown(e, index)} // Attach key down event
                          />
                          <Button
                            size="xs"
                            variant="invisible"
                            onClick={() => {
                              handleAddSubtask(index);
                            }}
                          >
                            <CheckIcon
                              className={`w-6 h-6 p-0 bg-none ${
                                checkGoalCompletion(index)
                                  ? "text-red-600"
                                  : "text-sky-500"
                              } hover:opacity-50"`}
                            />
                          </Button>
                        </div>
                      </div>

                      {/* // CONFIRMATION BUTTON */}

                      {/* <div className="flex justify-end justify-self-end space-x-2">
                <button
                  onClick={() => handleConfirmGoal(task.duration)}
                  disabled={taskDuration === undefined}
                  className="text-gray-300 hover:text-black"
                >
                  <CheckCircledIcon className="w-9 h-9 hover:bg-sky-400 rounded-full" />
                </button>
              </div> */}
                    </>
                  </div>
                </CarouselItem>
              ) : null
            )}
          </CarouselContent>
          <CarouselPrevious
            className={`transition-opacity duration-500   ${
              taskArray.length === 0 || carouselIndex === 0
                ? " !opacity-0 "
                : ""
            }`}
          />
          <CarouselNext
            className={`transition-opacity duration-500 ${
              taskArray.length === 0 ||
              carouselIndex === getGoalsList().length - 1
                ? "!opacity-0"
                : ""
            }`}
            // disabled={!goalComplete}
          />
        </Carousel>
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
          disabled={taskArray.length === 0 || checkTotalCompletion() === false}
          className="px-0"
        >
          <Link
            href={"/create/goals"}
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
