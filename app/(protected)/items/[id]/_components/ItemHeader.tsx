"use client";

import React, { useState } from "react";
import { Clock, Trash2, Check, Edit2, X } from "lucide-react";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardHeader,
} from "@/components/ui/Card";
import EventColorPicker from "@/components/events/EventColorPicker/EventColorPicker";
import { formatMinutesToHours } from "@/utils/taskArrayUtils";
import type { Planner, Category } from "@/types/prisma";

interface ItemHeaderProps {
  item: Planner;
  category: Category | null | undefined;
  totalDuration: number;
  subtasksLength: number;
  onSaveTitle: (newTitle: string) => void;
  onToggleReady: () => void;
  onDelete: () => void;
}

export function ItemHeader({
  item,
  category,
  totalDuration,
  subtasksLength,
  onSaveTitle,
  onToggleReady,
  onDelete,
}: ItemHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);

  const handleSaveTitle = () => {
    if (!editTitle.trim()) return;
    onSaveTitle(editTitle.trim());
    setIsEditingTitle(false);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {/* Color picker as icon */}
            <EventColorPicker taskId={item.id} />

            <div className="flex-1">
              {/* Category */}
              {category && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                  {category.icon && <span>{category.icon}</span>}
                  <span>{category.name}</span>
                </div>
              )}

              {/* Title */}
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-2xl font-bold h-auto py-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") setIsEditingTitle(false);
                    }}
                  />
                  <Button variant="ghost" size="sm" onClick={handleSaveTitle}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingTitle(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{item.title}</h1>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditTitle(item.title);
                      setIsEditingTitle(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Meta row */}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatMinutesToHours(totalDuration)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {item.itemType === "goal" && (
              <Button
                variant={item.isReady ? "default" : "outline"}
                onClick={onToggleReady}
                disabled={subtasksLength === 0}
                className="gap-2"
              >
                <CheckCircledIcon className="w-4 h-4" />
                {item.isReady ? "Ready" : "Mark Ready"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-muted-foreground hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
