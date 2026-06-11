"use client";

import { Caption } from "@/components/ui";
import TaskList from "@/components/tasks/TaskList";
import RootTaskListWrapper from "@/components/tasks/task-item-subcomponents/RootTaskListWrapper";
import AddSubtask from "@/components/tasks/task-item-subcomponents/AddSubtask";
import { useItem } from "../_components/ItemContext";
import {
  card,
  cardHeader,
  cardTitle,
  cardSubtitle,
  cardBody,
  legacyCardDisabled,
} from "./page.css";

export default function ItemSubtasksPage() {
  const { item, totalSubtasks } = useItem();
  const isGoal = item.plannerType === "goal";

  return (
    <div className={`${card} ${!isGoal ? legacyCardDisabled : ""}`}>
      <div className={cardHeader}>
        <div>
          <div className={cardTitle}>Subtasks</div>
          <Caption className={cardSubtitle}>
            {isGoal
              ? "Break down this goal into actionable tasks"
              : "Convert to a goal to add subtasks"}
          </Caption>
        </div>
        {isGoal && <Caption>{totalSubtasks}</Caption>}
      </div>
      {isGoal && (
        <div className={cardBody}>
          <RootTaskListWrapper subtasksLength={totalSubtasks}>
            <TaskList id={item.id} />
          </RootTaskListWrapper>
          <AddSubtask task={item} parentId={item.id} isMainParent />
        </div>
      )}
    </div>
  );
}
