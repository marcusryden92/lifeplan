"use client";

import TaskList from "@/components/tasks/TaskList";
import RootTaskListWrapper from "@/components/tasks/task-item-subcomponents/RootTaskListWrapper";
import AddSubtask from "@/components/tasks/task-item-subcomponents/AddSubtask";
import { useDraggableContext } from "@/components/draggable/DraggableContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { BottomSheet } from "@/components/ui";
import { useItem } from "../_components/ItemContext";
import { EditDrawer } from "./_components/EditDrawer";
import {
  layout,
  treePane,
  drawerSlot,
  drawerSlotOpen,
  drawerSheetFill,
  card,
  cardBody,
  legacyCardDisabled,
} from "./page.css";

export default function ItemSubtasksPage() {
  const { item, totalSubtasks } = useItem();
  const { focusedTask, setFocusedTask } = useDraggableContext();
  const isMobile = useIsMobile();
  const isGoal = item.plannerType === "goal";

  if (!isGoal) {
    return <div className={`${card} ${legacyCardDisabled}`} />;
  }

  const drawerOpen = !!focusedTask;

  return (
    <div className={layout}>
      <div className={treePane}>
        <div className={`${card} ${cardBody}`}>
          <RootTaskListWrapper subtasksLength={totalSubtasks}>
            <TaskList id={item.id} />
          </RootTaskListWrapper>
          <AddSubtask task={item} parentId={item.id} isMainParent />
        </div>
      </div>
      {isMobile ? (
        <BottomSheet
          open={drawerOpen}
          onOpenChange={(next) => {
            if (!next) setFocusedTask(null);
          }}
          title="Edit subtask"
          hideTitle
          flush
        >
          <div className={drawerSheetFill}>{drawerOpen && <EditDrawer />}</div>
        </BottomSheet>
      ) : (
        <div className={`${drawerSlot} ${drawerOpen ? drawerSlotOpen : ""}`}>
          {drawerOpen && <EditDrawer />}
        </div>
      )}
    </div>
  );
}
