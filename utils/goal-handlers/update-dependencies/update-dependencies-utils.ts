import React from "react";
import { Planner } from "@/lib/planner-class";
import { object } from "zod";

// Sets the value of the object's dependency to the value of the subject's dependency,
// and sets the value of the subject's dependent's dependency to the id of the object
export function transferDependencyLocation(
  taskArray: Planner[],
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  subject: Planner,
  object: Planner
) {
  const nextDependent = taskArray.find((t) => t.dependency === subject.id);
  const nextDependentId = nextDependent ? nextDependent.id : null;

  setTaskArray((prev) =>
    prev.map((t) => {
      if (nextDependentId && t.id === nextDependentId) {
        return { ...t, dependency: object.id };
      }

      if (subject.dependency && t.id === object.id) {
        return { ...t, dependency: subject.dependency };
      }
      return t;
    })
  );
}

interface InstructionsType {
  title?: string;
  id?: string;
  parentId?: string;
  type?: "task" | "plan" | "goal" | null;
  canInfluence?: boolean;
  duration?: number;
  deadline?: Date;
  starts?: Date;
  dependency?: string;
}

export function updateTaskArray(
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  instructions: {
    conditional: string; // Simplified conditional logic
    updates: InstructionsType;
  }[]
) {
  setTaskArray((prev) =>
    prev.map((t) => {
      // Loop through instructions and check conditions
      for (const s of instructions) {
        // Evaluate the conditional string securely (e.g., you can use Function or a custom parser here)
        // Be cautious with eval(). This example assumes the condition is a boolean expression on task properties.
        try {
          const conditionResult = new Function(
            "task",
            `return ${s.conditional}`
          ).call(null, t);
          if (conditionResult) {
            return { ...t, ...s.updates }; // Apply the instructions if the condition is true
          }
        } catch (error) {
          console.error("Error evaluating condition:", error);
        }
      }
      return t; // Return the task unchanged if no conditions matched
    })
  );
}
