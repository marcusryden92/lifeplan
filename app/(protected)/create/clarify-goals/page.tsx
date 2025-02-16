"use client";

// Third-party libraries
import { useState, useEffect } from "react";

import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/Carousel";
// Local components and context
import { useDataContext } from "@/context/DataContext";

import { CardContent } from "@/components/ui/Card";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DateTimePicker } from "@/components/utilities/time-picker/DateTimePicker";

import AddItemForm from "./_components/AddItemForm";
import AddSubtask from "./_components/task-item-subcomponents/AddSubtask";
import TaskList from "./_components/TaskList";
import RootTaskListWrapper from "./_components/task-item-subcomponents/RootTaskListWrapper";

// Local utilities
import { clickEdit, confirmEdit } from "@/utils/creationPagesFunctions";
import { Planner } from "@/lib/plannerClass";

import { getSubtasksById, deleteGoal } from "@/utils/goalPageHandlers";

import {
  totalSubtaskDuration,
  formatMinutesToHours,
} from "@/utils/taskArrayUtils";

export default function TasksPage() {
  const { taskArray, setTaskArray, focusedTask, setFocusedTask } =
    useDataContext();
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const [changeTask, setChangeToTask] = useState<number | null>(null);

  const [carouselIndex, setCarouselIndex] = useState<number | undefined>(
    undefined
  );

  const [goalComplete, setGoalComplete] = useState<boolean>(false);

  const devMode = false;

  const handleDeleteTask = (index: number, taskId: string) => {
    deleteGoal({ taskArray, setTaskArray, taskId });
    if (editIndex === index) {
      setEditIndex(null);
      setEditTitle("");
    }
  };

  const handleDeleteAll = () => {
    const filteredArray: Planner[] = taskArray.filter(
      (task) => task.canInfluence && task.type === "goal" && !task.parentId
    );

    filteredArray.forEach((item) =>
      deleteGoal({ taskArray, setTaskArray, taskId: item.id })
    );
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

  const handleDeleteTaskById = (taskId: string) => {
    setTaskArray(
      (prevTasks) => prevTasks.filter((task) => task.id !== taskId) // Filter out the task with the matching id
    );
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

  const checkGoalForCompletion = (index: number): boolean => {
    // const currentGoal = getCurrentGoal(index);

    const currentGoal = taskArray[index];

    if (taskArray && taskArray.length > 0) {
      const subtasks = getSubtasksById(taskArray, taskArray[index].id);

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

      const subtasks = getSubtasksById(taskArray, goal.id);

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
      setGoalComplete(checkGoalForCompletion(carouselIndex));
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

  return (
    <div className="flex flex-col lg:overflow-hidden w-full h-full   bg-opacity-95 px-10">
      {/* <CardHeader className="flex flex-row border-b px-0 py-6 space-x-10 items-center">
        <p className="text-xl font-semibold">CLARIFY GOALS</p>
        <p className="text-sm text-center">Clarify your goals.</p>
      </CardHeader> */}
      <CardContent className="px-0 py-6 border-b flex items-center justify-between">
        <AddItemForm />
        <button
          type="button"
          onClick={handleDeleteAll}
          className="flex bg-none text-gray-400 hover:text-red-500 text-[0.9rem]"
        >
          <TrashIcon className="w-5 h-5 mx-2" />
          Delete all
        </button>
      </CardContent>

      <div className="flex flex-1 lg:overflow-y-auto py-5  items-start justify-center flex-wrap content-start no-scrollbar ">
        <Carousel
          className="w-[90%] h-full"
          onIndexChange={(currentIndex: number | undefined) => {
            setCarouselIndex(currentIndex);
          }}
          opts={{ watchDrag: false }}
        >
          <CarouselContent className="h-full select-none">
            {taskArray.map((task, index) => {
              const subtasks = getSubtasksById(taskArray, task.id);

              return task.canInfluence &&
                task.type === "goal" &&
                !task.parentId ? (
                <CarouselItem key={index}>
                  <div
                    key={index}
                    className={`flex flex-col border-x border-gray-200   w-full h-full group hover:shadow-md px-12 py-4  transition-colors duration-300 ${
                      checkGoalForCompletion(index)
                        ? "border-y-2 border-x-2 border-emerald-500 border-opacity-70"
                        : ""
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
                            <div className="truncate">
                              {task.title.toUpperCase()}
                            </div>

                            {devMode && (
                              <span>
                                <span className="font-bold">ID: </span>
                                {task.id.substring(0, 4)}
                              </span>
                            )}
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
                                onClick={() => handleDeleteTask(index, task.id)}
                                className="cursor-pointer text-gray-400 hover:text-red-400"
                              >
                                <TrashIcon
                                  className={`w-5 h-5 ${
                                    task.type === "goal" ? "text-black" : ""
                                  }`}
                                />
                              </div>
                            </>
                          </div>
                        </div>
                      )}

                      {/* // DATE PICKER */}

                      <div className="flex flex-row  justify-between items-center border-b border-gray-600 border-opacity-15 py-1">
                        <div className="flex items-center">
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
                        <div className="flex flex-row  justify-between items-center space-x-2 border-opacity-15 py-2 ">
                          <div className="flex w-full justify-between items-center">
                            <span className="min-w-24 text-sm">
                              {"Total duration:  " +
                                formatMinutesToHours(
                                  totalSubtaskDuration(task.id, taskArray)
                                )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* // SUBTASKS LIST */}

                      <div className="flex py-2 overflow-y-scroll w-full no-scrollbar flex-grow">
                        <RootTaskListWrapper subtasksLength={subtasks.length}>
                          <TaskList
                            id={task.id}
                            focusedTask={focusedTask}
                            setFocusedTask={setFocusedTask}
                          />
                        </RootTaskListWrapper>
                      </div>

                      <AddSubtask task={task} parentId={task.id} isMainParent />
                    </>
                  </div>
                </CarouselItem>
              ) : null;
            })}
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

      {/* <CardFooter className="flex items-center justify-between flex-shrink p-4 border-t">
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
      </CardFooter> */}
    </div>
  );
}
