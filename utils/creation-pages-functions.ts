import { Planner } from "@/lib/plannerClass";
import { TaskListSchema } from "@/schemas";

import * as z from "zod";

// onSubmit function for creating new Planner instances

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
