"use client";

import { useDataContext } from "@/context/DataContext";

import { Planner } from "@/lib/planner-class";
import { Button } from "@/components/ui/button";
import { XMarkIcon } from "@heroicons/react/16/solid";

import {
  getTaskById,
  getSubtasksFromId,
  handleDeleteTaskById,
} from "@/utils/task-array-utils";

const TaskList = ({ id }: { id: string }) => {
  const { taskArray, setTaskArray } = useDataContext();

  const thisTask = getTaskById(taskArray, id);
  const subtasks = getSubtasksFromId(taskArray, id);

  return (
    <div className="flex flex-col justify-start flex-grow w-full">
      {subtasks
        ? subtasks.map((subtask) => <TaskList id={subtask.id} />)
        : thisTask && (
            <div className="flex justify-between items-center w-full text-sm py-2">
              <div className="truncate max-w-[180px]">{thisTask.title}</div>

              <div className="text-sm text-black pl-2 flex flex-shrink-0 items-start justify-start space-x-2 min-w-[100px]">
                <div>
                  {thisTask.duration} {" min"}
                </div>
                <Button
                  size="xs"
                  variant="invisible"
                  onClick={() =>
                    handleDeleteTaskById(setTaskArray, thisTask.id)
                  }
                >
                  <XMarkIcon className="w-5 h-5 text-red-500 hover:text-red-700" />
                </Button>
              </div>
            </div>
          )}
    </div>
  );
};

export default TaskList;
