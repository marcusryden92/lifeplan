import { useEffect } from "react";

// Components
import { Button } from "@/components/ui/Button";

// Icons
import { TrashIcon, PencilIcon } from "@heroicons/react/24/outline";
import React from "react";

// Data context
import { useDataContext } from "@/context/DataContext";

// Utils
import { deleteGoal } from "@/utils/goalPageHandlers";
import { getRootParent, getSubtasksById } from "@/utils/goalPageHandlers";
import { setGoalIsReady } from "@/utils/goal-handlers/toggleGoalIsReady";

// Definitions
import { TaskEditDeleteButtonsProps } from "@/lib/taskItem";

const TaskEditDeleteButtons: React.FC<TaskEditDeleteButtonsProps> = ({
  task,
  itemIsFocused,
  setDisplayEdit,
  setDisplayAddSubtask,
}) => {
  const { taskArray, setTaskArray } = useDataContext();
  const handleDelete = () => {
    deleteGoal({
      taskArray,
      setTaskArray,
      taskId: task.id,
      parentId: task.parentId,
    });
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Toggle edit field */}
      <Button
        disabled={!itemIsFocused}
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
            itemIsFocused ? "text-opacity-100" : "text-opacity-0"
          } hover:text-gray-500`}
        />
      </Button>
      {/* Delete task */}
      <Button
        disabled={!itemIsFocused}
        size="xs"
        variant="invisible"
        onClick={handleDelete}
        className="px-0"
      >
        <TrashIcon
          className={`w-5 h-5 text-gray-300  ${
            itemIsFocused ? "text-opacity-100" : "text-opacity-0"
          } hover:text-gray-500`}
        />
      </Button>
    </div>
  );
};

export default TaskEditDeleteButtons;
