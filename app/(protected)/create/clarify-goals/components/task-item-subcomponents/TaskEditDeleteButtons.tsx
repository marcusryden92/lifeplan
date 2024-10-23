// Components
import { Button } from "@/components/ui/button";

// Icons
import { TrashIcon, PencilIcon } from "@heroicons/react/24/outline";
import React from "react";

// Planner class
import { Planner } from "@/lib/planner-class";

// Data context
import { useDataContext } from "@/context/DataContext";

// Utils
import { deleteGoal } from "@/utils/goal-page-handlers";

interface TaskEditDeleteButtonsProps {
  task: Planner;
  itemFocused: boolean;
  setDisplayEdit: React.Dispatch<React.SetStateAction<boolean>>;
  setDisplayAddSubtask: React.Dispatch<React.SetStateAction<boolean>>;
}

const TaskEditDeleteButtons: React.FC<TaskEditDeleteButtonsProps> = ({
  task,
  itemFocused,
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
      {/* Delete task */}
      <Button
        disabled={!itemFocused}
        size="xs"
        variant="invisible"
        onClick={handleDelete}
        className="px-0"
      >
        <TrashIcon
          className={`w-5 h-5 text-gray-300  ${
            itemFocused ? "text-opacity-100" : "text-opacity-0"
          } hover:text-gray-500`}
        />
      </Button>
    </div>
  );
};

export default TaskEditDeleteButtons;
