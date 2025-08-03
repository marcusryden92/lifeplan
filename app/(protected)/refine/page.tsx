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
import { useDataContext } from "@/context/DataContext";
import Goal from "./_components/Goal";
import GoalsSidebar from "./_components/GoalsSidebar";

// Local utilities
import { Planner } from "@/prisma/generated/client";
import { deleteGoal } from "@/utils/goalPageHandlers";
import { toggleGoalIsReady } from "@/utils/goal-handlers/toggleGoalIsReady";

import styles from "./page.module.css";

export default function RefineGoalsPage() {
  const { userId, mainPlanner, setMainPlanner, focusedTask, setFocusedTask } =
    useDataContext();

  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [carouselIndex, setCarouselIndex] = useState<number | undefined>(
    undefined
  );

  const devMode = false;

  // Handler functions with proper dependency arrays - centralized to avoid duplication across Goal instances
  const handleDeleteTask = useCallback(
    (taskId: string) => {
      deleteGoal({ setMainPlanner, taskId, parentId: null });
    },
    [setMainPlanner]
  );

  const handleConfirmEdit = useCallback(
    (taskId: string, newTitle: string) => {
      setMainPlanner((prevTasks) =>
        prevTasks.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t))
      );
    },
    [setMainPlanner]
  );

  // Additional handlers moved from Goal component to avoid recreating for each goal
  const handleToggleReady = useCallback(
    (taskId: string) => {
      toggleGoalIsReady(setMainPlanner, taskId);
    },
    [setMainPlanner]
  );

  const handleUpdateDeadline = useCallback(
    (taskId: string, deadline: Date | null) => {
      setMainPlanner((prevArray: Planner[]) =>
        prevArray.map((t) => (t.id === taskId ? { ...t, deadline } : t))
      );
    },
    [setMainPlanner]
  );

  // Get all the goals
  const goalsList = useMemo(() => {
    return mainPlanner.filter((task) => task.type === "goal" && !task.parentId);
  }, [mainPlanner]);

  // Accessibility improvements for carousel controls
  const isPrevDisabled = mainPlanner.length === 0 || carouselIndex === 0;
  const isNextDisabled =
    mainPlanner.length === 0 || carouselIndex === goalsList.length - 1;

  return (
    <div className={styles.refinePageContainer}>
      <GoalsSidebar
        userId={userId}
        goalsList={goalsList}
        mainPlanner={mainPlanner}
        setMainPlanner={setMainPlanner}
        carouselIndex={carouselIndex}
        setCarouselIndex={setCarouselIndex}
        carouselApi={[carouselApi, setCarouselApi]}
      />

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
                  mainPlanner={mainPlanner}
                  setMainPlanner={setMainPlanner}
                  task={task}
                  focusedTask={focusedTask}
                  setFocusedTask={setFocusedTask}
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
    </div>
  );
}
