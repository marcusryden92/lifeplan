"use client";

// Icons
import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import { HiOutlinePlus } from "react-icons/hi";

// Definitions
import { AddSubtaskWrapperProps } from "@/lib/taskItem";

// Components
import AddSubtask from "./AddSubtask";

const AddSubtaskWrapper: React.FC<AddSubtaskWrapperProps> = ({
  task,
  subtasks,
  displayAddSubtask,
  setDisplayAddSubtask,
  itemIsFocused,
  displayEdit,
}) => {
  if (!itemIsFocused || displayEdit) return null;

  return displayAddSubtask ? (
    // Add subtask form
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
            itemIsFocused ? "text-opacity-100" : "text-opacity-0"
          } hover:text-gray-500`}
        />
      </button>
    </div>
  ) : (
    // Toggle buttom for displaying form
    <button
      className="flex items-center text-gray-300 hover:text-gray-500"
      onClick={() => {
        setDisplayAddSubtask(true);
      }}
    >
      Add subtask
      <HiOutlinePlus className={`w-6 h-6 mr-5 ml-2 bg-none `} />
    </button>
  );
};

export default AddSubtaskWrapper;
