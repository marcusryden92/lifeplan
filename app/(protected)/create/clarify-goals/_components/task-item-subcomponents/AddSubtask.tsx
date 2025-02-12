// React and Hooks
import { useState, useRef, createRef } from "react";

// Icons and components
import { HiOutlinePlus } from "react-icons/hi";
import { Input } from "@/components/ui/input";

// Definitions
import { AddSubtaskProps } from "@/lib/taskItem";

// Context
import { useDataContext } from "@/context/DataContext";

// Utility Functions
import { addSubtask } from "@/utils/goalPageHandlers";

const AddSubtask: React.FC<AddSubtaskProps> = ({
  task,
  parentId,
  isMainParent,
}) => {
  const [taskDuration, setTaskDuration] = useState<number | undefined>(
    undefined
  );
  const [taskTitle, setTaskTitle] = useState<string>("");

  const { taskArray, setTaskArray } = useDataContext();
  const refs = useRef(new Map<string, React.RefObject<HTMLInputElement>>());

  const getRef = (parentId: string) => {
    if (!refs.current.has(parentId)) {
      refs.current.set(parentId, createRef());
    }
    return refs.current.get(parentId);
  };

  const durationRef = useRef<HTMLInputElement>(null);

  const resetTaskState = () => {
    setTaskDuration(undefined);
    setTaskTitle("");
  };

  const handleAddSubtask = (parentId: string) => {
    if (taskTitle)
      addSubtask({
        taskArray,
        setTaskArray,
        parentId,
        taskDuration: taskDuration || 0,
        taskTitle,
        resetTaskState,
      });
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    parentId: string
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddSubtask(parentId);
      const ref = getRef(parentId);
      ref?.current?.focus();
    }
  };

  return (
    <div
      className={`mx-1 ${
        isMainParent ? "pt-4 border-t border-neutral-400 border-opacity-30" : ""
      }`}
    >
      <div className="flex gap-2 items-center justify-end flex-shrink">
        <Input
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          className={`bg-gray-20 bg-opacity-25 ${
            !isMainParent ? "max-w-[10rem]" : ""
          } border-gray-400 m-0 text-sm h-6 ${
            task.canInfluence ? "text-black" : ""
          }`}
          ref={getRef(parentId)}
          placeholder="New subtask name"
        />
        <Input
          value={taskDuration || ""}
          onChange={(e) => setTaskDuration(Number(e.target.value))}
          placeholder="min"
          className="w-14 h-6 text-sm py-0 text-black border-gray-400"
          type="number"
          pattern="[0-9]*"
          ref={durationRef}
          onKeyDown={(e) => handleKeyDown(e, parentId)}
        />
        <button
          disabled={!taskTitle}
          className={`${!taskTitle ? "opacity-50 pointer-events-none" : ""}`}
          onClick={() => handleAddSubtask(parentId)}
        >
          <HiOutlinePlus className="w-6 h-6 p-0 bg-none text-sky-500 hover:opacity-50" />
        </button>
      </div>
    </div>
  );
};

export default AddSubtask;
