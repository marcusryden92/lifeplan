import { HiOutlinePlus } from "react-icons/hi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useState, useRef, createRef } from "react";
import { Planner } from "@/lib/planner-class";
import { useDataContext } from "@/context/DataContext";
import { getSubtasksFromId } from "@/utils/task-array-utils";

const AddSubtask = ({
  task,
  parentId,
}: {
  task: Planner;
  parentId: string;
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
    if (taskDuration !== undefined && taskTitle) {
      const newTask = new Planner(
        taskTitle,
        parentId, // Using parentId here
        "goal",
        true,
        taskDuration
      );

      setTaskArray((prevTasks) => [...prevTasks, newTask]); // Spread prevTasks and add newTask

      resetTaskState();
    }
  };

  const resetTaskState = () => {
    setTaskDuration(undefined);
    setTaskTitle("");
  };

  const checkGoalCompletion = (parentId: string): boolean => {
    const currentGoal = taskArray.find((t) => t.id === parentId); // Find current goal using parentId
    const subtasks = getSubtasksFromId(taskArray, parentId); // Get subtasks from the current goal's ID

    if (
      currentGoal &&
      subtasks &&
      subtasks.length > 1 &&
      currentGoal.deadline !== undefined
    ) {
      return true;
    }

    return false;
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
    <div className="w-full my-2 mx-1 ">
      <div className="flex gap-2 items-center">
        <Input
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          className={`bg-gray-200 bg-opacity-25 border-none m-0 text-sm h-auto ${
            task.canInfluence ? "text-black" : ""
          }`}
          ref={getRef(parentId)} // Attach ref dynamically using parentId
        />
        <Input
          value={taskDuration || ""} // Ensure it's always a string
          onChange={(e) => setTaskDuration(Number(e.target.value))}
          placeholder={"min"}
          className="w-14 h-7 text-sm text-black"
          type="number"
          pattern="[0-9]*"
          ref={durationRef} // Attach ref to the duration input
          onKeyDown={(e) => handleKeyDown(e, parentId)} // Attach key down event with parentId
        />
        <Button
          size="xs"
          variant="invisible"
          onClick={() => {
            handleAddSubtask(parentId);
          }}
        >
          <HiOutlinePlus
            className={`w-6 h-6 p-0 bg-none ${
              checkGoalCompletion(parentId) ? "text-red-600" : "text-sky-500"
            } hover:opacity-50`}
          />
        </Button>
      </div>
    </div>
  );
};

export default AddSubtask;
