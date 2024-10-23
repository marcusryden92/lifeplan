"use client";

import { useEffect, useState, useRef } from "react";
import { useDataContext } from "@/context/DataContext";
import { Planner } from "@/lib/planner-class";
import { Button } from "@/components/ui/button";
import {
  getTaskById,
  handleDeleteTaskById,
  totalSubtaskDuration,
  formatMinutesToHours,
} from "@/utils/task-array-utils";

import { getSubtasksFromId } from "@/utils/goal-page-handlers";

import {
  TrashIcon,
  PencilIcon,
  ArrowUturnLeftIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

import { RxDot } from "react-icons/rx";

import { IoIosArrowForward, IoIosArrowDown } from "react-icons/io";

import { HiOutlinePlus } from "react-icons/hi";

import { Input } from "@/components/ui/input";

import AddSubtask from "./add-subtask";

import { editById } from "@/utils/creation-pages-functions";

import {
  sortTasksByDependencies,
  deleteGoal,
} from "@/utils/goal-page-handlers";

interface TaskItemProps {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  task: Planner;
  subtasks: Planner[];
  onDelete: (id: string, parentId: string | undefined) => void;
  focusedTask: string | null;
  setFocusedTask: React.Dispatch<React.SetStateAction<string | null>>;
}

const TaskItem = ({
  taskArray,
  setTaskArray,
  task,
  subtasks,
  onDelete,
  focusedTask,
  setFocusedTask,
}: TaskItemProps) => {
  const [totalTaskDuration, setTotalTaskDuration] = useState(
    totalSubtaskDuration(task.id, taskArray)
  );

  const [itemFocused, setItemFocused] = useState<boolean>(false);
  const [displayEdit, setDisplayEdit] = useState<boolean>(false);
  const [displayAddSubtask, setDisplayAddSubtask] = useState<boolean>(false);

  const [subtasksMinimized, setSubtasksMinimized] = useState<boolean>(false);

  const [editTitle, setEditTitle] = useState<string>(task.title);
  const [editDuration, setEditDuration] = useState<number | undefined>(
    task.duration
  );

  const headerRef = useRef<HTMLDivElement | null>(null);

  let sortedTasks: Planner[] = [];

  const devMode = true;

  if (subtasks.length !== 0) {
    sortedTasks = sortTasksByDependencies(taskArray, subtasks);
  }

  useEffect(() => {
    if (itemFocused) {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          headerRef.current &&
          !headerRef.current.contains(event.target as Node)
        ) {
          setItemFocused(false); // Set itemFocused to false when clicking outside
        }
      };

      document.addEventListener("mousedown", handleClickOutside);

      // Cleanup function to remove listener when `itemFocused` is false
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [itemFocused, setFocusedTask]);

  useEffect(() => {
    if (!itemFocused) {
      setDisplayEdit(false);
    }
  });

  const handleSetFocusedTask = () => {
    if (focusedTask === task.id) {
      setFocusedTask(null);
    } else setFocusedTask(task.id);
  };

  const handleConfirmEdit = () => {
    editById({
      editTitle,
      editDuration,
      editId: task.id,
      setTaskArray,
    });
    setDisplayEdit(false);
  };

  useEffect(() => {
    if (task.id === focusedTask) {
      setItemFocused(true);
    } else {
      setItemFocused(false);
    }
  }, [focusedTask]);

  useEffect(() => {
    setTotalTaskDuration(totalSubtaskDuration(task.id, taskArray));
  }, [taskArray]);

  return (
    <div
      className={` ${subtasks.length !== 0 && "pb-1"} ${
        task.parentId && "pl-2"
      }`}
    >
      {task.parentId && (
        // MAIN HEADER DIV
        <div
          ref={headerRef}
          className={`flex justify-between  items-center w-full text-sm py-2 group`}
        >
          <div
            className={`flex items-center justify-between flex-grow ${
              subtasks.length !== 0 && !itemFocused && "opacity-50"
            }`}
          >
            <div className="flex items-center space-x-5">
              {!displayEdit ? (
                <div className="flex space-x-2">
                  {/* BUTTON TO MINIMIZE OR DISPLAY SUBTASKS LIST */}
                  <button
                    disabled={subtasks.length === 0}
                    className={`translate-x-[-40%] ${
                      itemFocused && "text-sky-500"
                    } `}
                    onClick={() => {
                      setSubtasksMinimized((prev) => !prev);
                    }}
                  >
                    {subtasks.length === 0 ? (
                      <RxDot />
                    ) : subtasksMinimized ? (
                      <IoIosArrowForward />
                    ) : (
                      <IoIosArrowDown />
                    )}
                  </button>
                  {/* TASK TITLE */}
                  <span
                    onClick={handleSetFocusedTask}
                    className={`truncate ${itemFocused && " text-sky-400 "}`}
                  >
                    {task.title}
                  </span>

                  {devMode && (
                    <>
                      <span>
                        <span className="font-bold">ID: </span>
                        {task.id.substring(0, 4)}
                      </span>
                      {task.dependency && (
                        <span>
                          <span className="font-bold">DE: </span>
                          {task.dependency.substring(0, 4)}
                        </span>
                      )}
                    </>
                  )}

                  {/* EDIT- AND DELETE-BUTTONS */}

                  {/* EDIT */}
                  <Button
                    disabled={!itemFocused}
                    size="xs"
                    variant="invisible"
                    onClick={() => {
                      setDisplayEdit(true);
                      setDisplayAddSubtask(false);
                    }}
                    className="px-0"
                  >
                    <PencilIcon
                      className={`w-5 h-5 text-gray-300  ${
                        itemFocused ? "text-opacity-100" : "text-opacity-0"
                      } hover:text-gray-500`}
                    />
                  </Button>

                  {/* DELETE */}
                  <Button
                    disabled={!itemFocused}
                    size="xs"
                    variant="invisible"
                    onClick={() => onDelete(task.id, task.parentId)}
                    className="px-0"
                  >
                    <TrashIcon
                      className={`w-5 h-5 text-gray-300  ${
                        itemFocused ? "text-opacity-100" : "text-opacity-0"
                      } hover:text-gray-500`}
                    />
                  </Button>
                </div>
              ) : (
                <>
                  {/* FORM FOR EDITING TASK TITLE AND DURATION */}
                  <div className="flex items-center space-x-2">
                    {/* TITLE */}
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={`bg-gray-200 bg-opacity-25 border-none m-0 text-sm h-auto ${
                        task.canInfluence ? "text-black" : ""
                      }`}
                    />
                    {subtasks.length === 0 && (
                      /* DURATION */
                      <Input
                        defaultValue={task.duration}
                        onChange={(e) =>
                          setEditDuration(Number(e.target.value))
                        }
                        placeholder={task.duration?.toString() || "min"}
                        className="w-14 h-7 text-sm"
                        type="number"
                        pattern="[0-9]*"
                      />
                    )}
                    {/* CONFIRM */}
                    <Button
                      size="xs"
                      variant="invisible"
                      onClick={handleConfirmEdit}
                    >
                      <CheckIcon className="w-6 h-6 p-0 bg-none text-sky-500 hover:opacity-50" />
                    </Button>

                    {/* CANCEL */}
                    <Button
                      disabled={!itemFocused}
                      size="xs"
                      variant="invisible"
                      onClick={() => {
                        setDisplayEdit(false);
                        setEditTitle(task.title);
                      }}
                      className="px-0"
                    >
                      <ArrowUturnLeftIcon
                        className={`w-5 h-5 text-gray-300  ${
                          itemFocused ? "text-opacity-100" : "text-opacity-0"
                        } hover:text-gray-500`}
                      />
                    </Button>
                  </div>
                </>
              )}

              {itemFocused &&
                !displayEdit &&
                (displayAddSubtask ? (
                  /* "ADD SUBTASK" FORM */

                  <div className="flex items-center">
                    <AddSubtask
                      task={task}
                      parentId={task.id}
                      subtasksLength={subtasks.length}
                    />
                    <button
                      onClick={() => {
                        setDisplayAddSubtask(false);
                      }}
                    >
                      <ArrowUturnLeftIcon
                        className={`w-5 h-5 text-gray-300  ${
                          itemFocused ? "text-opacity-100" : "text-opacity-0"
                        } hover:text-gray-500`}
                      />
                    </button>
                  </div>
                ) : (
                  /* BUTTON TO TOGGLE "ADD SUBTASK" FORM */

                  <button
                    className="flex items-center text-gray-300 hover:text-gray-500"
                    onClick={() => {
                      setDisplayAddSubtask(true);
                    }}
                  >
                    Add subtask
                    <HiOutlinePlus className={`w-6 h-6 mr-5 ml-2 bg-none `} />
                  </button>
                ))}
            </div>

            {/* DURATION DISPLAY */}
            {!displayEdit && (
              <div className="flex text-sm text-black pl-2  flex-shrink-0 items-start justify-end space-x-2">
                <div className={`${itemFocused && "text-sky-500"}`}>
                  {formatMinutesToHours(
                    subtasks.length === 0
                      ? task.duration || 0
                      : totalTaskDuration
                  )}
                  {}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/*RENDER SUBTASKS IF THERE ARE ANY */}
      {subtasks.length > 0 && (
        <div
          style={{
            height: subtasksMinimized ? "0px" : "auto",
            transition: "height ease 1000ms",
          }}
          className={`overflow-hidden ${
            task.parentId
              ? `pl-5 ${
                  itemFocused
                    ? "border-l-2 border-sky-400 "
                    : "border-l-2 border-gray-200"
                }`
              : ""
          }`}
        >
          {sortedTasks.map((subtask) => (
            <TaskList
              key={subtask.id}
              id={subtask.id}
              focusedTask={focusedTask}
              setFocusedTask={setFocusedTask}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TaskList = ({
  id,
  focusedTask,
  setFocusedTask,
}: {
  id: string;
  focusedTask: string | null;
  setFocusedTask: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
  const { taskArray, setTaskArray } = useDataContext();

  const thisTask = getTaskById(taskArray, id);
  const subtasks = getSubtasksFromId(taskArray, id);

  if (!thisTask) return null; // Avoid rendering if the task doesn't exist.

  const handleDelete = (taskId: string, parentId: string | undefined) => {
    deleteGoal({ taskArray, setTaskArray, taskId, parentId });
  };

  return (
    <div className="flex flex-col justify-start flex-grow w-full">
      <TaskItem
        taskArray={taskArray}
        setTaskArray={setTaskArray}
        task={thisTask}
        subtasks={subtasks}
        onDelete={handleDelete}
        focusedTask={focusedTask}
        setFocusedTask={setFocusedTask}
      />
    </div>
  );
};

export default TaskList;
