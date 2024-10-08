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
  editDuration?: number;
  editId: string;
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
}

export const editById = ({
  editTitle,
  editDuration,
  editId,
  setTaskArray,
}: editByIdProps) => {
  setTaskArray((prevTasks) =>
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

// GET GOAL SUBTASKS FROM GOAL ID

export function getSubtasksFromId(taskArray: Planner[], id: string) {
  let subtasksArray: Planner[] = [];

  taskArray.forEach((task) => {
    if (task.parentId === id) {
      subtasksArray.push(task);
    }
  });

  return subtasksArray;
}

// SORT TASKS BY DEPENDENCIES

export function sortTasksByDependencies(tasks: Planner[]) {
  // Tasks with an empty dependency array
  const independentTasks: Planner[] = [];

  // Tasks with an empty dependency array, with dependends
  const rootTasks: Planner[] = [];

  // Tasks with an empty dependency array, without dependents
  const standAloneTasks: Planner[] = [];

  // Final, sorted array
  const sortedArray: Planner[] = [];

  // Get independent tasks from the tasks array
  tasks.forEach((task) => {
    if (!task.dependencies || task.dependencies?.length === 0) {
      independentTasks.push(task);
    }
  });

  independentTasks.forEach((task) => {
    // Check if any other task in the tasks array has this task's id in their dependencies array
    const hasDependents = tasks.some((otherTask) =>
      otherTask.dependencies?.includes(task.id)
    );

    if (hasDependents) {
      rootTasks.push(task);
    } else {
      standAloneTasks.push(task);
    }
  });

  // Function to push a root task and its children
  const pushChildToArray = (task: Planner) => {
    // Push the parent first
    sortedArray.push(task);

    // Find tasks that depend on this task (children)
    const dependentTasks = tasks.filter((otherTask) =>
      otherTask.dependencies?.includes(task.id)
    );

    // Recursively push each dependent task
    dependentTasks.forEach((dependentTask) => {
      pushChildToArray(dependentTask);
    });
  };

  // Start by pushing all the independent tasks
  rootTasks.forEach((task) => {
    pushChildToArray(task);
  });

  // Finally, push stand-alone tasks (with no dependencies and no dependents)
  standAloneTasks.forEach((task) => {
    sortedArray.push(task);
  });

  return sortedArray;
}

export function getTreeBottomLayer(
  taskArray: Planner[],
  id: string
): Planner[] {
  const subtasks: Planner[] = taskArray.filter((task) => task.parentId === id);

  if (subtasks.length === 0) return taskArray.filter((task) => task.id === id);

  return subtasks.reduce((bottomLayer: Planner[], task: Planner) => {
    return [...bottomLayer, ...getTreeBottomLayer(taskArray, task.id)];
  }, []);
}
