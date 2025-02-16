"use client";

import React, { useState } from "react";

// Components
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Definitions
import { TaskEditFormProps } from "@/lib/taskItem";

// Icons
import { ArrowUturnLeftIcon, CheckIcon } from "@heroicons/react/24/outline";

// Utils
import { editById } from "@/utils/creationPagesFunctions";

// Data context
import { useDataContext } from "@/context/DataContext";

const TaskEditForm: React.FC<TaskEditFormProps> = ({
  task,
  subtasks,
  setDisplayEdit,
  itemIsFocused,
}) => {
  const { setTaskArray } = useDataContext();

  const [editTitle, setEditTitle] = useState<string>(task.title);
  const [editDuration, setEditDuration] = useState<number | undefined>(
    task.duration
  );

  const handleConfirmEdit = () => {
    editById({
      editTitle,
      editDuration,
      editId: task.id,
      setTaskArray,
    });
    setDisplayEdit(false);
  };
  return (
    <div className="flex items-center space-x-2">
      {/* Edit title */}
      <Input
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        className={`bg-gray-200 bg-opacity-25 border-none m-0 text-sm h-auto ${
          task.canInfluence ? "text-black" : ""
        }`}
      />
      {subtasks.length === 0 && (
        /* Edit duration */
        <Input
          defaultValue={task.duration}
          onChange={(e) => setEditDuration(Number(e.target.value))}
          placeholder={task.duration?.toString() || "min"}
          className="w-14 h-7 text-sm"
          type="number"
          pattern="[0-9]*"
        />
      )}
      {/* Confirm edit */}
      <Button size="xs" variant="invisible" onClick={handleConfirmEdit}>
        <CheckIcon className="w-6 h-6 p-0 bg-none text-sky-500 hover:opacity-50" />
      </Button>

      {/* Cancel edit */}
      <Button
        disabled={!itemIsFocused}
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
            itemIsFocused ? "text-opacity-100" : "text-opacity-0"
          } hover:text-gray-500`}
        />
      </Button>
    </div>
  );
};

export default TaskEditForm;
