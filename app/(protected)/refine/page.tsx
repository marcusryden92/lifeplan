"use client";

// Third-party libraries
import { useState, useMemo, useCallback } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi,
} from "@/components/ui/Carousel";

import { Button } from "@/components/ui/Button";

// Local components and context
import { useDataContext } from "@/context/DataContext";
import { CardContent } from "@/components/ui/Card";
import Goal from "./_components/Goal";
import AddItemForm from "./_components/AddItemForm";

// Local utilities
import { Planner } from "@/lib/plannerClass";
import { deleteGoal } from "@/utils/goalPageHandlers";
import { toggleGoalIsReady } from "@/utils/goal-handlers/toggleGoalIsReady";

import styles from "./page.module.css";

export default function RefineGoalsPage() {
  const { mainPlanner, setMainPlanner, focusedTask, setFocusedTask } =
    useDataContext();

  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [carouselIndex, setCarouselIndex] = useState<number | undefined>(
    undefined
  );

  const devMode = false;

  // Handler functions with proper dependency arrays - centralized to avoid duplication across Goal instances
  const handleDeleteTask = useCallback(
    (taskId: string) => {
      deleteGoal({ setMainPlanner, taskId });
    },
    [setMainPlanner]
  );

  const handleDeleteAll = useCallback(() => {
    const filteredArray = mainPlanner.filter(
      (task) => task.canInfluence && task.type === "goal" && !task.parentId
    );

    filteredArray.forEach((item) =>
      deleteGoal({ setMainPlanner, taskId: item.id })
    );
  }, [mainPlanner, setMainPlanner]);

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
    (taskId: string, deadline: Date | undefined) => {
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
      <CardContent className="max-w-[220px] pl-0 pr-[2.5rem] mb-8 flex flex-col items-center justify-between">
        <AddItemForm
          placeholder="Add goal"
          className="h-[80px] border-b border-b-[#d1d5db] pb-[1rem] justify-end"
        />

        <section className="flex flex-col w-full h-full flex-1 gap-2 my-5">
          {goalsList.map((item, index) => (
            <Button
              variant="outline"
              size="sm"
              key={`goalsList-${item.id}`}
              onClick={() => {
                setCarouselIndex(index);
                carouselApi?.scrollTo(index);
              }}
              className={`text-left justify-start px-3 py-2 rounded-lg ${index === carouselIndex && "bg-slate-300 text-white hover:text-white"}`}
            >
              {item.title}
            </Button>
          ))}
        </section>

        <button
          type="button"
          onClick={handleDeleteAll}
          className="flex bg-none text-gray-400 hover:text-red-500 text-[0.9rem] mr-10"
          aria-label="Delete all goals"
        >
          <TrashIcon className="w-5 h-5 mx-2" />
          Delete all
        </button>
      </CardContent>

      <div className="flex flex-1 lg:overflow-y-auto my-8 border-l items-start justify-center flex-wrap content-start no-scrollbar">
        <Carousel
          className="w-[90%] max-w-[700px] h-full"
          onIndexChange={setCarouselIndex}
          setApi={setCarouselApi}
          opts={{ watchDrag: false }}
        >
          <CarouselContent className="h-full select-none">
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
