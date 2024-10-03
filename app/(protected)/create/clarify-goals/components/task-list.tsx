"use client";

import { useEffect, useState } from "react";
import { useDataContext } from "@/context/DataContext";
import { Planner } from "@/lib/planner-class";
import { Button } from "@/components/ui/button";
import { XMarkIcon } from "@heroicons/react/16/solid";
import {
  getTaskById,
  getSubtasksFromId,
  handleDeleteTaskById,
  totalSubtaskDuration,
  formatMinutesToHours,
} from "@/utils/task-array-utils";
import { TrashIcon } from "@heroicons/react/24/outline";

import AddSubtask from "./add-subtask";

interface TaskItemProps {
  taskArray: Planner[];
  task: Planner;
  subtasks: Planner[];
  onDelete: (id: string) => void;
  focusedTask: string | null;
  setFocusedTask: React.Dispatch<React.SetStateAction<string | null>>;
}

const TaskItem = ({
  taskArray,
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

  const handleSetFocusedTask = () => {
    if (focusedTask === task.id) {
      setFocusedTask(null);
    } else setFocusedTask(task.id);
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
    <div className={` ${subtasks.length !== 0 && "pb-1"} pl-2`}>
      {task.parentId && (
        <div
          className={`flex justify-between  items-center w-full text-sm py-2 group`}
        >
          <div
            className={`flex items-center justify-between flex-grow ${
              subtasks.length !== 0 && !itemFocused && "opacity-50"
            }`}
          >
            <span
              onClick={handleSetFocusedTask}
              className={`truncate ${itemFocused && " text-sky-400 "}`}
            >
              {" "}
              {task.title}{" "}
            </span>
            {itemFocused && <AddSubtask task={task} parentId={task.id} />}
          </div>

          <div className="text-sm text-black pl-2 flex flex-shrink-0 items-start justify-start space-x-2 min-w-[100px]">
            <div>
              {formatMinutesToHours(
                subtasks.length === 0 ? task.duration || 0 : totalTaskDuration
              )}
              {}
            </div>
            <Button
              disabled={!itemFocused}
              size="xs"
              variant="invisible"
              onClick={() => onDelete(task.id)}
            >
              <TrashIcon
                className={`w-5 h-5 text-gray-300  ${
                  itemFocused ? "text-opacity-100" : "text-opacity-0"
                } hover:text-gray-500`}
              />
            </Button>
          </div>
        </div>
      )}{" "}
      {subtasks.length > 0 && (
        <div
          className={
            task.parentId
              ? `pl-5 space-y-2 ${
                  itemFocused
                    ? "border-l-2 border-sky-400 "
                    : "border-l-2 border-gray-200"
                }`
              : ""
          }
        >
          {subtasks.map((subtask) => (
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

  const handleDelete = (taskId: string) => {
    handleDeleteTaskById(setTaskArray, taskId);
  };

  return (
    <div className="flex flex-col justify-start flex-grow w-full">
      <TaskItem
        taskArray={taskArray}
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
