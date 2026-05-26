"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import {
  Clock,
  Calendar,
  Target,
  CheckSquare,
  CalendarClock,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Planner, Category, Location } from "@/types/prisma";
import { PlannerType } from "@/types/prisma";

interface ItemCardProps {
  item: Planner;
  category?: Category;
  location?: Location;
  subtaskCount?: number;
  completedSubtasks?: number;
}

const typeConfig = {
  task: {
    icon: CheckSquare,
    text: "text-[#c89b4a]",
    badge:
      "bg-[#c89b4a]/15 text-[#c89b4a] hover:bg-[#c89b4a]/15 border-transparent",
    label: "Task",
  },
  plan: {
    icon: CalendarClock,
    text: "text-[#5d8eaa]",
    badge:
      "bg-[#5d8eaa]/15 text-[#5d8eaa] hover:bg-[#5d8eaa]/15 border-transparent",
    label: "Plan",
  },
  goal: {
    icon: Target,
    text: "text-[#9077b3]",
    badge:
      "bg-[#9077b3]/15 text-[#9077b3] hover:bg-[#9077b3]/15 border-transparent",
    label: "Goal",
  },
  template: {
    icon: Calendar,
    text: "text-[#94a3ad]",
    badge:
      "bg-[#94a3ad]/15 text-[#94a3ad] hover:bg-[#94a3ad]/15 border-transparent",
    label: "Template",
  },
  travel: {
    icon: Clock,
    text: "text-[#6f9b81]",
    badge:
      "bg-[#6f9b81]/15 text-[#6f9b81] hover:bg-[#6f9b81]/15 border-transparent",
    label: "Travel",
  },
} as const;

export function ItemCard({
  item,
  category,
  location,
  subtaskCount = 0,
  completedSubtasks = 0,
}: ItemCardProps) {
  const router = useRouter();
  const config =
    item.plannerType in typeConfig
      ? typeConfig[item.plannerType as keyof typeof typeConfig]
      : typeConfig.task;
  const isOverdue =
    item.deadline &&
    new Date(item.deadline) < new Date() &&
    !item.completedEndTime;

  return (
    <button
      onClick={() => router.push(`/items/${item.id}`)}
      className="w-full text-left p-2 pl-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white group"
    >
      <div className="flex items-start gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-2 min-w-0">
            <Badge className={config.badge}>{config.label}</Badge>
            <span className="font-medium text-gray-900 truncate min-w-0">
              {item.title}
            </span>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {/* Category breadcrumb */}
            {category && (
              <span className="flex items-center gap-1">
                {category.icon && <span>{category.icon}</span>}
                <span>{category.name}</span>
              </span>
            )}
            {/* Duration */}
            {item.duration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {item.duration >= 60
                  ? `${Math.floor(item.duration / 60)}h ${item.duration % 60 > 0 ? `${item.duration % 60}m` : ""}`
                  : `${item.duration}m`}
              </span>
            )}

            {/* Deadline */}
            {item.deadline && (
              <span
                className={`flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : ""}`}
              >
                <Calendar className="w-3 h-3" />
                {format(new Date(item.deadline), "MMM d, yyyy")}
                {isOverdue && " (overdue)"}
              </span>
            )}

            {/* Scheduled time for plans */}
            {item.starts && (
              <span className="flex items-center gap-1">
                <CalendarClock className="w-3 h-3" />
                {format(new Date(item.starts), "MMM d, h:mm a")}
              </span>
            )}

            {/* Location */}
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {location.name}
              </span>
            )}

            {/* Subtask progress for goals */}
            {item.plannerType === PlannerType.goal && subtaskCount > 0 && (
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {completedSubtasks}/{subtaskCount} subtasks
              </span>
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center self-stretch gap-1">
          {item.isReady && (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              Ready
            </Badge>
          )}
          {item.completedEndTime && (
            <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">
              Completed
            </Badge>
          )}
          <ChevronRight className="w-4 h-4 text-gray-400 transition-opacity" />
        </div>
      </div>
    </button>
  );
}
