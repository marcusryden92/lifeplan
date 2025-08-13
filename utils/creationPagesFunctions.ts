import { Planner } from "@/prisma/generated/client";
import { TaskListSchema } from "@/schemas";
import { calendarColors } from "@/data/calendarColors";
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
  updatePlannerArray: (
    planner: Planner[] | ((prev: Planner[]) => Planner[])
  ) => void;
  setDefaultInfluence?: boolean | undefined;
  type?: "task" | "plan" | "goal" | null;
}

export const onSubmit = ({
  userId,
  values,
  updatePlannerArray,
  editIndex,
  setEditIndex,
  editTitle,
  setEditTitle,
  form,
  type,
}: OnSubmitProps) => {
  if (!userId) return;

  if (editIndex !== null) {
    updatePlannerArray((prevTasks) =>
      prevTasks.map((task, index) =>
        index === editIndex ? { ...task, title: editTitle } : task
      )
    );
    setEditIndex(null);
    setEditTitle("");
  } else {
    const now = new Date();

    const newTask: Planner = {
      userId,
      title: values.title,
      id: uuidv4(),
      parentId: null,
      type: type || "goal",
      isReady: true,
      duration: 5,
      deadline: null,
      starts: null,
      dependency: null,
      completedStartTime: null,
      completedEndTime: null,
      color: calendarColors[0],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    updatePlannerArray((prevTasks) => [...prevTasks, newTask]);
  }
  form.reset();
};

// DELETE TASK

interface DeleteTaskProps {
  updatePlannerArray: (
    planner: Planner[] | ((prev: Planner[]) => Planner[])
  ) => void;
  editIndex: number | null;
  setEditIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setEditTitle: React.Dispatch<React.SetStateAction<string>>;
}

export const deleteTask = (
  index: number,
  { updatePlannerArray, editIndex, setEditIndex, setEditTitle }: DeleteTaskProps
) => {
  updatePlannerArray((prevTasks) => prevTasks.filter((_, i) => i !== index));
  if (editIndex === index) {
    setEditIndex(null);
    setEditTitle("");
  }
};

// DELETE ALL TASKS

interface DeleteAllProps {
  updatePlannerArray: (
    planner: Planner[] | ((prev: Planner[]) => Planner[])
  ) => void;
  filter?: Planner[]; // Replace `any` with your actual task type if necessary
}

export const deleteAll = ({ updatePlannerArray, filter }: DeleteAllProps) => {
  // If filter is not provided or is an empty array, clear the entire planner
  if (!filter || filter.length === 0) {
    updatePlannerArray([]);
    return;
  }

  // Otherwise, filter out tasks that match the filter array
  updatePlannerArray((prevTaskArray) =>
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
  planner: Planner[]; // Adjust type according to your task structure
}

export const clickEdit = ({
  index,
  setEditIndex,
  setEditTitle,
  planner,
}: ClickEditProps) => {
  setEditIndex(index);
  setEditTitle(planner[index].title);
};

//

interface ConfirmEditProps {
  editIndex: number | null;
  editTitle: string;
  updatePlannerArray: (
    planner: Planner[] | ((prev: Planner[]) => Planner[])
  ) => void;
  setEditIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setEditTitle: React.Dispatch<React.SetStateAction<string>>;
}

export const confirmEdit = ({
  editIndex,
  editTitle,
  updatePlannerArray,
  setEditIndex,
  setEditTitle,
}: ConfirmEditProps) => {
  if (editIndex !== null) {
    updatePlannerArray((prevTasks) =>
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
  editDuration: number | null;
  editId: string;
  updatePlannerArray: (
    planner: Planner[] | ((prev: Planner[]) => Planner[])
  ) => void;
}

export const editById = ({
  editTitle,
  editDuration,
  editId,
  updatePlannerArray,
}: editByIdProps) => {
  updatePlannerArray((prevTasks) =>
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
