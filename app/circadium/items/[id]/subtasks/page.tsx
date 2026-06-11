"use client";

import TaskList from "@/components/tasks/TaskList";
import RootTaskListWrapper from "@/components/tasks/task-item-subcomponents/RootTaskListWrapper";
import AddSubtask from "@/components/tasks/task-item-subcomponents/AddSubtask";
import { useItem } from "../_components/ItemContext";
import { card, cardBody, legacyCardDisabled } from "./page.css";

export default function ItemSubtasksPage() {
  const { item, totalSubtasks } = useItem();
  const isGoal = item.plannerType === "goal";

  if (!isGoal) {
    return <div className={`${card} ${legacyCardDisabled}`} />;
  }

  return (
    <div className={card}>
      <div className={cardBody}>
        <RootTaskListWrapper subtasksLength={totalSubtasks}>
          <TaskList id={item.id} />
        </RootTaskListWrapper>
        <AddSubtask task={item} parentId={item.id} isMainParent />
      </div>
    </div>
  );
}
