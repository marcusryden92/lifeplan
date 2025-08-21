"use client";

// Third-party libraries
import { useState, useMemo, useCallback } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi,
} from "@/components/ui/Carousel";

// Local components and context
import { useCalendarProvider } from "@/context/CalendarProvider";
import { DraggableContextProvider } from "@/components/draggable/DraggableContext";
import Goal from "./_components/Goal";
import GoalsSidebar from "./_components/GoalsSidebar";

// Local utilities
import { Planner } from "@/prisma/generated/client";
import { deleteGoal } from "@/utils/goalPageHandlers";
import { toggleGoalIsReady } from "@/utils/goal-handlers/toggleGoalIsReady";

import styles from "./page.module.css";

export default function RefineGoalsPage() {
  const { userId, planner, updatePlannerArray } = useCalendarProvider();

  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [carouselIndex, setCarouselIndex] = useState<number | undefined>(
    undefined
  );

  const devMode = false;

  // Handler functions with proper dependency arrays - centralized to avoid duplication across Goal instances
  const handleDeleteTask = useCallback(
    (taskId: string) => {
      deleteGoal({ updatePlannerArray, taskId, parentId: null });
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

  // Accessibility improvements for carousel controls
  const isPrevDisabled = planner.length === 0 || carouselIndex === 0;
  const isNextDisabled =
    planner.length === 0 || carouselIndex === goalsList.length - 1;

  return (
    <div className={styles.refinePageContainer}>
      <GoalsSidebar
        userId={userId}
        goalsList={goalsList}
        planner={planner}
        updatePlannerArray={updatePlannerArray}
        carouselIndex={carouselIndex}
        setCarouselIndex={setCarouselIndex}
        carouselApi={[carouselApi, setCarouselApi]}
      />
      <DraggableContextProvider>
        <div className="flex flex-1 lg:overflow-y-auto my-8 border-l items-start justify-center flex-wrap content-start no-scrollbar">
          <Carousel
            className="w-[90%] max-w-[700px] h-full border-x"
            onIndexChange={setCarouselIndex}
            setApi={setCarouselApi}
            opts={{ watchDrag: false }}
          >
            <CarouselContent className="h-full select-none ">
              {goalsList.map((task) => (
                <CarouselItem key={task.id}>
                  <Goal
                    planner={planner}
                    updatePlannerArray={updatePlannerArray}
                    task={task}
                    devMode={devMode}
                    handleDeleteTask={handleDeleteTask}
                    handleConfirmEdit={handleConfirmEdit}
                    handleToggleReady={handleToggleReady}
                    handleUpdateDeadline={handleUpdateDeadline}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious
              className={`transition-opacity duration-500 ${
                isPrevDisabled ? "!opacity-0" : ""
              }`}
              aria-disabled={isPrevDisabled}
              tabIndex={isPrevDisabled ? -1 : 0}
            />
            <CarouselNext
              className={`transition-opacity duration-500 ${
                isNextDisabled ? "!opacity-0" : ""
              }`}
              aria-disabled={isNextDisabled}
              tabIndex={isNextDisabled ? -1 : 0}
            />
          </Carousel>
        </div>
      </DraggableContextProvider>
    </div>
  );
}
