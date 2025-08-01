import { Planner } from "@prisma/client";
import { TaskListSchema } from "@/schemas";

import { v4 as uuidv4 } from "uuid";

import * as z from "zod";

// SUBMIT NEW PLANNER INSTANCE TO TASK ARRAY

interface OnSubmitProps {
  userId: string | undefined;
  values: z.infer<typeof TaskListSchema>;
  editIndex: number | null;
  setEditIndex: (index: number | null) => void;
  editTitle: string;
  setEditTitle: (title: string) => void;
  form: { reset: () => void };
  setMainPlanner: React.Dispatch<React.SetStateAction<Planner[]>>;
  setDefaultInfluence?: boolean | undefined;
  type?: "task" | "plan" | "goal" | null;
}

export const onSubmit = ({
  userId,
  values,
  setMainPlanner,
  editIndex,
  setEditIndex,
  editTitle,
  setEditTitle,
  form,
  type,
}: OnSubmitProps) => {
  if (!userId) return;

  if (editIndex !== null) {
    setMainPlanner((prevTasks) =>
      prevTasks.map((task, index) =>
        index === editIndex ? { ...task, title: editTitle } : task
      )
    );
    setEditIndex(null);
    setEditTitle("");
  } else {
    const newTask: Planner = {
      userId,
      title: values.title,
      id: uuidv4(),
      parentId: null,
      type: type || "goal",
      isReady: true,
      duration: null,
      deadline: null,
      starts: null,
      dependency: null,
      completedStartTime: null,
      completedEndTime: null,
    };
    setMainPlanner((prevTasks) => [...prevTasks, newTask]);
  }
  form.reset();
};

// DELETE TASK

interface DeleteTaskProps {
  setMainPlanner: React.Dispatch<React.SetStateAction<Planner[]>>;
  editIndex: number | null;
  setEditIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setEditTitle: React.Dispatch<React.SetStateAction<string>>;
}

export const deleteTask = (
  index: number,
  { setMainPlanner, editIndex, setEditIndex, setEditTitle }: DeleteTaskProps
) => {
  setMainPlanner((prevTasks) => prevTasks.filter((_, i) => i !== index));
  if (editIndex === index) {
    setEditIndex(null);
    setEditTitle("");
  }
};

// DELETE ALL TASKS

interface DeleteAllProps {
  setMainPlanner: React.Dispatch<React.SetStateAction<Planner[]>>;
  filter?: Planner[]; // Replace `any` with your actual task type if necessary
}

export const deleteAll = ({ setMainPlanner, filter }: DeleteAllProps) => {
  // If filter is not provided or is an empty array, clear the entire mainPlanner
  if (!filter || filter.length === 0) {
    setMainPlanner([]);
    return;
  }

  // Otherwise, filter out tasks that match the filter array
  setMainPlanner((prevTaskArray) =>
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
  mainPlanner: Planner[]; // Adjust type according to your task structure
}

export const clickEdit = ({
  index,
  setEditIndex,
  setEditTitle,
  mainPlanner,
}: ClickEditProps) => {
  setEditIndex(index);
  setEditTitle(mainPlanner[index].title);
};

//

interface ConfirmEditProps {
  editIndex: number | null;
  editTitle: string;
  setMainPlanner: React.Dispatch<React.SetStateAction<Planner[]>>;
  setEditIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setEditTitle: React.Dispatch<React.SetStateAction<string>>;
}

export const confirmEdit = ({
  editIndex,
  editTitle,
  setMainPlanner,
  setEditIndex,
  setEditTitle,
}: ConfirmEditProps) => {
  if (editIndex !== null) {
    setMainPlanner((prevTasks) =>
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
  editDuration?: number;
  editId: string;
  setMainPlanner: React.Dispatch<React.SetStateAction<Planner[]>>;
}

export const editById = ({
  editTitle,
  editDuration,
  editId,
  setMainPlanner,
}: editByIdProps) => {
  setMainPlanner((prevTasks) =>
    prevTasks.map((task) => {
      if (task.id === editId) {
        return {
          ...task,
          title: editTitle,
          ...(editDuration !== undefined && { duration: editDuration }),
        };
      }
      return task;
    })
  );
};
