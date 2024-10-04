import { Planner } from "@/lib/planner-class";
import { TaskListSchema } from "@/schemas";

import * as z from "zod";

// SUBMIT NEW PLANNER INSTANCE TO TASK ARRAY

interface OnSubmitProps {
  values: z.infer<typeof TaskListSchema>;
  editIndex: number | null;
  setEditIndex: (index: number | null) => void;
  editTitle: string;
  setEditTitle: (title: string) => void;
  form: { reset: () => void };
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  setDefaultInfluence?: boolean | undefined;
  type?: "task" | "plan" | "goal" | null;
}

export const onSubmit = ({
  values,
  setTaskArray,
  editIndex,
  setEditIndex,
  editTitle,
  setEditTitle,
  form,
  setDefaultInfluence,
  type,
}: OnSubmitProps) => {
  if (editIndex !== null) {
    setTaskArray((prevTasks) =>
      prevTasks.map((task, index) =>
        index === editIndex ? new Planner(editTitle) : task
      )
    );
    setEditIndex(null);
    setEditTitle("");
  } else {
    const newTask = new Planner(
      values.title,
      undefined,
      type,
      setDefaultInfluence || false
    );
    setTaskArray((prevTasks) => [...prevTasks, newTask]);
  }
  form.reset();
};

// DELETE TASK

interface DeleteTaskProps {
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  editIndex: number | null;
  setEditIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setEditTitle: React.Dispatch<React.SetStateAction<string>>;
}

export const deleteTask = (
  index: number,
  { setTaskArray, editIndex, setEditIndex, setEditTitle }: DeleteTaskProps
) => {
  setTaskArray((prevTasks) => prevTasks.filter((_, i) => i !== index));
  if (editIndex === index) {
    setEditIndex(null);
    setEditTitle("");
  }
};

// DELETE ALL TASKS

interface DeleteAllProps {
  setTaskArray: React.Dispatch<React.SetStateAction<any[]>>;
  filter?: Planner[]; // Replace `any` with your actual task type if necessary
}

export const deleteAll = ({ setTaskArray, filter }: DeleteAllProps) => {
  // If filter is not provided or is an empty array, clear the entire taskArray
  if (!filter || filter.length === 0) {
    setTaskArray([]);
    return;
  }

  // Otherwise, filter out tasks that match the filter array
  setTaskArray((prevTaskArray) =>
    prevTaskArray.filter(
      (task) => !filter.some((filteredTask) => filteredTask.id === task.id)
    )
  );
};

// CLICK EDIT AND CONFIRM EDIT

interface ClickEditProps {
  index: number;
  setEditIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setEditTitle: React.Dispatch<React.SetStateAction<string>>;
  taskArray: Planner[]; // Adjust type according to your task structure
}

export const clickEdit = ({
  index,
  setEditIndex,
  setEditTitle,
  taskArray,
}: ClickEditProps) => {
  setEditIndex(index);
  setEditTitle(taskArray[index].title);
};

//

interface ConfirmEditProps {
  editIndex: number | null;
  editTitle: string;
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  setEditIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setEditTitle: React.Dispatch<React.SetStateAction<string>>;
}

export const confirmEdit = ({
  editIndex,
  editTitle,
  setTaskArray,
  setEditIndex,
  setEditTitle,
}: ConfirmEditProps) => {
  if (editIndex !== null) {
    setTaskArray((prevTasks) =>
      prevTasks.map((task, index) => {
        if (index === editIndex) {
          // Modify the title of the existing Planner instance
          return { ...task, title: editTitle };
        }
        return task;
      })
    );
    setEditIndex(null);
    setEditTitle("");
  }
};

interface editByIdProps {
  editTitle: string;
  editId: string;
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
}

export const editById = ({
  editTitle,
  editId,
  setTaskArray,
}: editByIdProps) => {
  setTaskArray((prevTasks) =>
    prevTasks.map((task) => {
      if (task.id === editId) {
        // Modify the title of the existing Planner instance
        return { ...task, title: editTitle };
      }
      return task;
    })
  );
};

// Get goal subtasks from goalId:

export function getSubtasksFromId(taskArray: Planner[], id: string) {
  let subtasksArray: Planner[] = [];

  taskArray.forEach((task) => {
    if (task.parentId === id) {
      subtasksArray.push(task);
    }
  });

  return subtasksArray;
}
