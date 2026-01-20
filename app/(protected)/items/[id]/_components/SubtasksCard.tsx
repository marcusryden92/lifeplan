"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import TaskList from "@/components/tasks/TaskList";
import RootTaskListWrapper from "@/components/tasks/task-item-subcomponents/RootTaskListWrapper";
import AddSubtask from "@/components/tasks/task-item-subcomponents/AddSubtask";
import type { Planner } from "@/types/prisma";

interface SubtasksCardProps {
  item: Planner;
  subtasksLength: number;
}

export function SubtasksCard({ item, subtasksLength }: SubtasksCardProps) {
  return (
    <Card
      className={`h-fit ${item.itemType !== "goal" ? "opacity-40 pointer-events-none" : ""}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Subtasks</CardTitle>
            <CardDescription>
              {item.itemType === "goal"
                ? "Break down this goal into actionable tasks"
                : "Convert to a goal to add subtasks"}
            </CardDescription>
          </div>
          {item.itemType === "goal" && (
            <Badge variant="outline">
              {subtasksLength} subtask
              {subtasksLength !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      {item.itemType === "goal" && (
        <CardContent>
          {/* Subtask list using existing components */}
          <div className="mb-4">
            <RootTaskListWrapper subtasksLength={subtasksLength}>
              <TaskList id={item.id} />
            </RootTaskListWrapper>
          </div>

          {/* Add subtask */}
          <AddSubtask task={item} parentId={item.id} isMainParent />
        </CardContent>
      )}
    </Card>
  );
}
