import React from "react";
import { Planner } from "@prisma/client";

// Sets the value of the object's dependency to the value of the subject's dependency,
// and sets the value of the subject's dependent's dependency to the id of the object
export function transferDependencyOwnership(
  mainPlanner: Planner[],
  setMainPlanner: React.Dispatch<React.SetStateAction<Planner[]>>,
  subject: Planner,
  object: Planner,
  clearSubject: boolean = true
) {
  const nextDependent = mainPlanner.find((t) => t.dependency === subject.id);
  const nextDependentId = nextDependent ? nextDependent.id : null;

  setMainPlanner((prev) =>
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
        return { ...t, dependency: undefined };
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

export async function updateTaskArray(
  setMainPlanner: React.Dispatch<React.SetStateAction<Planner[]>>,
  instructions: InstructionType[]
) {
  return new Promise<void>((resolve) => {
    setMainPlanner((prev) => {
      const newArray = prev.map((task) => {
        let updatedTask = { ...task };

        for (const instruction of instructions) {
          try {
            if (instruction.conditional(task)) {
              updatedTask = { ...updatedTask, ...instruction.updates };
            }
          } catch (error) {
            console.error("Error evaluating condition:", error);
          }
        }

        return updatedTask;
      });

      // Defer resolving to ensure React state updates complete
      setTimeout(resolve, 0);
      return newArray;
    });
  });
}
