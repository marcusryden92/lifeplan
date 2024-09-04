import { Planner } from "@/lib/plannerClass";
import { TaskListSchema } from "@/schemas";

import * as z from "zod";

// ONSUBMIT() FUNCTION FOR CREATING PLANNER INSTANCES

interface OnSubmitProps {
  values: z.infer<typeof TaskListSchema>;
  editIndex: number | null;
  setEditIndex: (index: number | null) => void;
  editTitle: string;
  setEditTitle: (title: string) => void;
  form: { reset: () => void };
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  setDefaultInfluence?: boolean | undefined;
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
      null,
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
  setTaskArray: React.Dispatch<React.SetStateAction<any[]>>; // Replace `any` with your actual task type if necessary
}

export const deleteAll = ({ setTaskArray }: DeleteAllProps) => {
  setTaskArray([]);
};

// EDIT AND UPDATE

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

//---------------------------------

interface ConfirmEditProps {
  taskArray: Planner[];
  editIndex: number | null;
  editTitle: string;
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  setEditIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setEditTitle: React.Dispatch<React.SetStateAction<string>>;
}

export const confirmEdit = ({
  taskArray,
  editIndex,
  editTitle,
  setTaskArray,
  setEditIndex,
  setEditTitle,
}: ConfirmEditProps) => {
  if (editIndex !== null) {
    setTaskArray((prevTasks) =>
      prevTasks.map((task, index) =>
        index === editIndex ? new Planner(editTitle) : task
      )
    );
    setEditIndex(null);
    setEditTitle("");
  }
};
