import { HiOutlinePlus } from "react-icons/hi";
import { Input } from "@/components/ui/input";

import { useState, useRef, createRef } from "react";
import { Planner } from "@/lib/planner-class";
import { useDataContext } from "@/context/DataContext";
import { addSubtask } from "@/utils/goal-page-handlers";

const AddSubtask = ({
  task,
  parentId,
  isMainParent,
}: {
  task: Planner;
  parentId: string;
  isMainParent?: boolean;
  subtasksLength?: number;
}) => {
  const [taskDuration, setTaskDuration] = useState<number | undefined>(
    undefined
  );
  const [taskTitle, setTaskTitle] = useState<string>("");

  const { taskArray, setTaskArray } = useDataContext();

  // Updated to use string keys (parentId)
  const refs = useRef(new Map<string, React.RefObject<HTMLInputElement>>());

  const getRef = (parentId: string) => {
    if (!refs.current.has(parentId)) {
      refs.current.set(parentId, createRef());
    }
    return refs.current.get(parentId);
  };

  const durationRef = useRef<HTMLInputElement>(null);

  const handleAddSubtask = (parentId: string) => {
    addSubtask({
      taskArray,
      setTaskArray,
      parentId,
      taskDuration: taskDuration || 0,
      taskTitle,
      resetTaskState,
    });
  };

  const resetTaskState = () => {
    setTaskDuration(undefined);
    setTaskTitle("");
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    parentId: string
  ) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent default Enter key behavior (e.g., form submission)
      handleAddSubtask(parentId); // Call handleAddSubtask with parentId
      const ref = getRef(parentId);
      if (ref?.current) {
        ref.current.focus(); // Focus on the correct taskTitle input field
      }
    }
  };

  return (
    <div
      className={` mx-1 ${
        isMainParent && "pt-4 border-t border-neutral-400 border-opacity-30 "
      }`}
    >
      <div className="flex gap-2 items-center justify-end flex-shrink">
        <Input
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          className={`bg-gray-20 bg-opacity-25 ${
            !isMainParent && "max-w-[10rem]"
          } border-gray-400 m-0 text-sm h-6 ${
            task.canInfluence ? "text-black" : ""
          }`}
          ref={getRef(parentId)} // Attach ref dynamically using parentId
          placeholder="New subtask name"
        />
        <Input
          value={taskDuration || ""} // Ensure it's always a string
          onChange={(e) => setTaskDuration(Number(e.target.value))}
          placeholder={"min"}
          className="w-14 h-6 text-sm py-0 text-black border-gray-400"
          type="number"
          pattern="[0-9]*"
          ref={durationRef} // Attach ref to the duration input
          onKeyDown={(e) => handleKeyDown(e, parentId)} // Attach key down event with parentId
        />
        <button
          onClick={() => {
            handleAddSubtask(parentId);
          }}
        >
          <HiOutlinePlus
            className={`w-6 h-6 p-0 bg-none text-sky-500 hover:opacity-50`}
          />
        </button>
      </div>
    </div>
  );
};

export default AddSubtask;
