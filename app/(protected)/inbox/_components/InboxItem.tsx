"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Edit2,
  Trash2,
  Check,
  X,
  Clock,
  Calendar,
  Target,
  CheckSquare,
  CalendarClock,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Badge } from "@/components/ui/Badge";
import type { Planner, Category } from "@/types/prisma";

interface InboxItemProps {
  item: Planner;
  category?: Category;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onClassify: (item: Planner) => void;
}

const typeConfig = {
  task: { icon: CheckSquare, color: "bg-amber-500", label: "Task" },
  plan: { icon: CalendarClock, color: "bg-blue-500", label: "Plan" },
  goal: { icon: Target, color: "bg-purple-500", label: "Goal" },
  template: { icon: Calendar, color: "bg-gray-500", label: "Template" },
  travel: { icon: Clock, color: "bg-green-500", label: "Travel" },
} as const;

export function InboxItem({
  item,
  category,
  onEdit,
  onDelete,
  onClassify,
}: InboxItemProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);

  const config =
    item.plannerType in typeConfig
      ? typeConfig[item.plannerType as keyof typeof typeConfig]
      : typeConfig.task;
  const Icon = config.icon;

  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle !== item.title) {
      onEdit(item.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setEditTitle(item.title);
      setIsEditing(false);
    }
  };

  // Check if item needs classification (no duration set, or unprocessed)
  const needsClassification = !item.duration || item.duration === 0;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50 group ${
        needsClassification
          ? "border-amber-200 bg-amber-50/50"
          : "border-gray-200"
      }`}
    >
      {/* Type indicator */}
      <div className={`p-1.5 rounded ${config.color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              className="h-8"
              autoFocus
            />
            <Button variant="ghost" size="sm" onClick={handleSaveEdit}>
              <Check className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditTitle(item.title);
                setIsEditing(false);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => onClassify(item)}
            className="block w-full text-left"
          >
            <div className="font-medium truncate">{item.title}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              {category && (
                <span className="flex items-center gap-1">
                  {category.icon && <span>{category.icon}</span>}
                  {category.name}
                </span>
              )}
              {item.duration > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.duration}m
                </span>
              )}
              {item.deadline && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(item.deadline), "MMM d")}
                </span>
              )}
            </div>
          </button>
        )}
      </div>

      {/* Status badge */}
      {needsClassification && (
        <Badge variant="outline" className="text-amber-600 border-amber-300">
          Unprocessed
        </Badge>
      )}

      {/* Actions */}
      {!isEditing && (
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onClassify(item)}>
                <Target className="w-4 h-4 mr-2" />
                Classify
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(item.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/items/${item.id}`)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
