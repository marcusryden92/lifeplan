"use client";

import { useCallback } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { CardContent } from "@/components/ui/Card";
import AddItemForm from "./AddItemForm";
import { deleteGoal } from "@/utils/goalPageHandlers";
import { Planner } from "@/prisma/generated/client";

import { CarouselApi } from "@/components/ui/Carousel";

interface GoalsSidebarProps {
  userId: string | undefined;
  goalsList: Planner[];
  planner: Planner[];
  updateAll: (planner: Planner[] | ((prev: Planner[]) => Planner[])) => void;
  carouselIndex: number | undefined;
  setCarouselIndex: React.Dispatch<React.SetStateAction<number | undefined>>;
  carouselApi: [
    CarouselApi | null,
    React.Dispatch<React.SetStateAction<CarouselApi | null>>,
  ];
}

export default function GoalsSidebar({
  userId,
  goalsList,
  planner,
  updateAll,
  carouselIndex,
  setCarouselIndex,
  carouselApi,
}: GoalsSidebarProps) {
  const [api] = carouselApi;
  const handleDeleteAll = useCallback(() => {
    const filteredArray = planner.filter(
      (task) => task.itemType === "goal" && !task.parentId
    );

    filteredArray.forEach((item) =>
      deleteGoal({
        updateAll,
        taskId: item.id,
        parentId: item.parentId,
      })
    );
  }, [planner, updateAll]);

  return (
    <CardContent className="max-w-[220px] pl-0 pr-[2.5rem] mb-8 flex flex-col items-center justify-between">
      <AddItemForm
        userId={userId}
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
              api?.scrollTo(index);
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
  );
}
