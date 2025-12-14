"use client";

// Third-party libraries
import { useState, useMemo, useCallback, useEffect } from "react";
// Removed Carousel in favor of simple index navigation

// Local components and context
import { useCalendarProvider } from "@/context/CalendarProvider";
import { DraggableContextProvider } from "@/components/draggable/DraggableContext";
import Goal from "./_components/Goal";
import GoalsSidebar from "./_components/GoalsSidebar";

// Local utilities
import { Planner } from "@/types/prisma";
import { deleteGoal } from "@/utils/goalPageHandlers";
import { toggleGoalIsReady } from "@/utils/goal-handlers/toggleGoalIsReady";

import styles from "./page.module.css";

export default function RefineGoalsPage() {
  const { userId, planner, updatePlannerArray, updateAll } =
    useCalendarProvider();

  const [carouselIndex, setCarouselIndex] = useState<number | undefined>(
    undefined
  );

  const devMode = false;

  // Handler functions with proper dependency arrays - centralized to avoid duplication across Goal instances
  const handleDeleteTask = useCallback(
    (taskId: string) => {
      deleteGoal({ updateAll, taskId, parentId: null });
    },
    [updatePlannerArray]
  );

  const handleConfirmEdit = useCallback(
    (taskId: string, newTitle: string) => {
      updatePlannerArray((prevTasks) =>
        prevTasks.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t))
      );
    },
    [updatePlannerArray]
  );

  // Additional handlers moved from Goal component to avoid recreating for each goal
  const handleToggleReady = useCallback(
    (taskId: string) => {
      toggleGoalIsReady(updatePlannerArray, taskId);
    },
    [updatePlannerArray]
  );

  const handleUpdateDeadline = useCallback(
    (taskId: string, deadline: string | null) => {
      updatePlannerArray((prevArray: Planner[]) =>
        prevArray.map((t) => (t.id === taskId ? { ...t, deadline } : t))
      );
    },
    [updatePlannerArray]
  );

  // Get all the goals
  const goalsList = useMemo(() => {
    return planner.filter((task) => task.itemType === "goal" && !task.parentId);
  }, [planner]);

  // Initialize selected index when goalsList changes
  useEffect(() => {
    if (!goalsList.length) {
      setCarouselIndex(undefined);
    } else if (
      carouselIndex === undefined ||
      carouselIndex >= goalsList.length
    ) {
      setCarouselIndex(0);
    }
  }, [goalsList, carouselIndex]);

  // Accessibility improvements for carousel controls
  const isPrevDisabled = planner.length === 0 || carouselIndex === 0;
  const isNextDisabled =
    planner.length === 0 ||
    carouselIndex === undefined ||
    carouselIndex === goalsList.length - 1;

  const goPrev = () => {
    if (carouselIndex === undefined) return;
    setCarouselIndex((idx) => (idx && idx > 0 ? idx - 1 : 0));
  };

  const goNext = () => {
    if (carouselIndex === undefined) return;
    setCarouselIndex((idx) => {
      if (idx === undefined) return idx;
      const next = idx + 1;
      return next < goalsList.length ? next : idx;
    });
  };

  return (
    <div className={styles.refinePageContainer}>
      <GoalsSidebar
        userId={userId}
        goalsList={goalsList}
        planner={planner}
        updateAll={updateAll}
        carouselIndex={carouselIndex}
        setCarouselIndex={setCarouselIndex}
        carouselApi={[null, () => {}]}
      />
      <DraggableContextProvider>
        <div className="flex flex-1 lg:overflow-y-auto my-8 border-l items-start justify-center flex-wrap content-start no-scrollbar">
          <div className="w-[90%] max-w-[700px] h-full border-x flex flex-col items-stretch">
            <div className="flex-1 select-none">
              {carouselIndex !== undefined && goalsList[carouselIndex] && (
                <Goal
                  planner={planner}
                  updatePlannerArray={updatePlannerArray}
                  task={goalsList[carouselIndex]}
                  devMode={devMode}
                  handleDeleteTask={handleDeleteTask}
                  handleConfirmEdit={handleConfirmEdit}
                  handleToggleReady={handleToggleReady}
                  handleUpdateDeadline={handleUpdateDeadline}
                />
              )}
            </div>
            <div className="flex items-center justify-between p-2">
              <button
                className={`transition-opacity duration-500 btn btn-secondary ${isPrevDisabled ? "!opacity-0" : ""}`}
                onClick={goPrev}
                aria-disabled={isPrevDisabled}
                tabIndex={isPrevDisabled ? -1 : 0}
              >
                Previous
              </button>
              <div className="text-sm text-muted-foreground">
                {goalsList.length > 0 && carouselIndex !== undefined
                  ? `${carouselIndex + 1} / ${goalsList.length}`
                  : "No goals"}
              </div>
              <button
                className={`transition-opacity duration-500 btn btn-secondary ${isNextDisabled ? "!opacity-0" : ""}`}
                onClick={goNext}
                aria-disabled={isNextDisabled}
                tabIndex={isNextDisabled ? -1 : 0}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </DraggableContextProvider>
    </div>
  );
}
