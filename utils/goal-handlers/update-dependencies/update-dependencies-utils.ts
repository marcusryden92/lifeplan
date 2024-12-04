import React from "react";
import { Planner } from "@/lib/planner-class";
import { object } from "zod";

// Sets the value of the object's dependency to the value of the subject's dependency,
// and sets the value of the subject's dependent's dependency to the id of the object
export function transferDependencyOwnership(
  taskArray: Planner[],
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  subject: Planner,
  object: Planner,
  clearSubject: boolean = true
) {
  const nextDependent = taskArray.find((t) => t.dependency === subject.id);
  const nextDependentId = nextDependent ? nextDependent.id : null;

  setTaskArray((prev) =>
    prev.map((t) => {
      // Move ownership from subject to object
      if (nextDependentId && t.id === nextDependentId) {
        return { ...t, dependency: object.id };
      }

      if (subject.dependency && t.id === object.id) {
        return { ...t, dependency: subject.dependency };
      }

      // and clear subject
      if (clearSubject && t.id === subject.id) {
        return { ...t, dependency: subject.dependency };
      }
      return t;
    })
  );
}

type UpdatesType = Partial<Planner>;

export interface InstructionType {
  conditional: (task: Planner) => boolean;
  updates: UpdatesType;
}

export function updateTaskArray(
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  instructions: InstructionType[]
) {
  setTaskArray((prev) =>
    prev.map((task) => {
      // Track whether any updates were applied
      let updatedTask = { ...task };
      let updateApplied = false;

      // Apply all matching instructions
      for (const instruction of instructions) {
        try {
          if (instruction.conditional(task)) {
            updatedTask = { ...updatedTask, ...instruction.updates };
            updateApplied = true;
          }
        } catch (error) {
          console.error("Error evaluating condition:", error);
        }
      }

      return updatedTask;
    })
  );
}
