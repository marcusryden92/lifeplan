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
import { ItemType } from "@/types/prisma";

interface ItemCardProps {
  item: Planner;
  category?: Category;
  location?: Location;
  subtaskCount?: number;
  completedSubtasks?: number;
}

const typeConfig = {
  task: { icon: CheckSquare, color: "bg-amber-500", label: "Task" },
  plan: { icon: CalendarClock, color: "bg-blue-500", label: "Plan" },
  goal: { icon: Target, color: "bg-purple-500", label: "Goal" },
  template: { icon: Calendar, color: "bg-gray-500", label: "Template" },
  travel: { icon: Clock, color: "bg-green-500", label: "Travel" },
} as const;

export function ItemCard({
  item,
  category,
  location,
  subtaskCount = 0,
  completedSubtasks = 0,
}: ItemCardProps) {
  const router = useRouter();
  const config = (item.itemType in typeConfig) ? typeConfig[item.itemType as keyof typeof typeConfig] : typeConfig.task;
  const Icon = config.icon;

  const isOverdue =
    item.deadline && new Date(item.deadline) < new Date() && !item.completedEndTime;

  return (
    <button
      onClick={() => router.push(`/items/${item.id}`)}
      className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white group"
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className={`p-2 rounded-lg ${config.color} mt-0.5`}>
          <Icon className="w-4 h-4 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Category breadcrumb */}
          {category && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              {category.icon && <span>{category.icon}</span>}
              <span>{category.name}</span>
            </div>
          )}

          {/* Title */}
          <h3 className="font-medium text-gray-900 truncate pr-4">
            {item.title}
          </h3>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
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
            {item.itemType === ItemType.goal && subtaskCount > 0 && (
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {completedSubtasks}/{subtaskCount} subtasks
              </span>
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-col items-end gap-1">
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
          <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
        </div>
      </div>
    </button>
  );
}
