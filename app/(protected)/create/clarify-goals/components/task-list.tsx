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

import AddSubtask from "./add-subtask";

interface TaskItemProps {
  taskArray: Planner[];
  task: Planner;
  subtasks: Planner[];
  onDelete: (id: string) => void;
}

const TaskItem = ({ taskArray, task, subtasks, onDelete }: TaskItemProps) => {
  const [totalTaskDuration, setTotalTaskDuration] = useState(
    totalSubtaskDuration(task.id, taskArray)
  );

  const [itemFocused, setItemFocused] = useState<boolean>(false);

  useEffect(() => {
    setTotalTaskDuration(totalSubtaskDuration(task.id, taskArray));
  }, [taskArray]);

  return (
    <div
      className={`${
        itemFocused && "ring-2 ring-blue-400 bg-sky-50"
      } rounded-xl px-2 pb-1`}
    >
      {task.parentId && (
        <div
          className={`flex justify-between  items-center w-full text-sm py-2`}
        >
          <div
            className={`flex items-center justify-between flex-grow ${
              subtasks.length !== 0 && "opacity-50"
            }`}
          >
            <span
              onClick={() => {
                setItemFocused((prev) => !prev);
              }}
              className="truncate"
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
              size="xs"
              variant="invisible"
              onClick={() => onDelete(task.id)}
            >
              <XMarkIcon className="w-5 h-5 text-red-500 hover:text-red-700" />
            </Button>
          </div>
        </div>
      )}{" "}
      {subtasks.length > 0 && (
        <div
          className={
            task.parentId ? "pl-5 space-y-2 border-white border-l" : ""
          }
        >
          {subtasks.map((subtask) => (
            <TaskList key={subtask.id} id={subtask.id} />
          ))}
        </div>
      )}
    </div>
  );
};

const TaskList = ({ id }: { id: string }) => {
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
      />
    </div>
  );
};

export default TaskList;
