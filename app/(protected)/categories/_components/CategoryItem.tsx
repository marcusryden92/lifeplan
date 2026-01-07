"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Plus,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Category } from "@/types/prisma";

interface CategoryItemProps {
  category: Category & { children?: Category[]; _count?: { planners: number } };
  level: number;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAddSubcategory: (parentId: string) => void;
  onOpenSettings: (id: string) => void;
  onSelect?: (id: string) => void;
  selectedId?: string;
}

export function CategoryItem({
  category,
  level,
  onEdit,
  onDelete,
  onAddSubcategory,
  onOpenSettings,
  onSelect,
  selectedId,
}: CategoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);

  const hasChildren = category.children && category.children.length > 0;
  const itemCount = category._count?.planners ?? 0;

  const handleSaveEdit = () => {
    if (editName.trim() && editName !== category.name) {
      onEdit(category.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setEditName(category.name);
      setIsEditing(false);
    }
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-2 px-2 rounded-md hover:bg-gray-100 group transition-colors ${
          selectedId === category.id
            ? "bg-blue-50 border-l-2 border-blue-500"
            : ""
        }`}
        style={{ paddingLeft: `${level * 24 + 8}px` }}
      >
        {/* Expand/collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-0.5 rounded hover:bg-gray-200 ${!hasChildren ? "invisible" : ""}`}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {/* Icon */}
        {category.icon && <span className="text-lg">{category.icon}</span>}

        {/* Color dot */}
        {category.color && (
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: category.color }}
          />
        )}

        {/* Name */}
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm flex-1"
            autoFocus
          />
        ) : (
          <button
            onClick={() => onSelect?.(category.id)}
            className="flex-1 text-left text-sm font-medium truncate"
          >
            {category.name}
          </button>
        )}

        {/* Item count */}
        {itemCount > 0 && (
          <span className="text-xs text-gray-400 mr-2">
            {itemCount} item{itemCount !== 1 ? "s" : ""}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddSubcategory(category.id)}
            className="h-7 w-7 p-0"
            title="Add subcategory"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenSettings(category.id)}
            className="h-7 w-7 p-0"
            title="Settings (time constraints, location)"
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-7 w-7 p-0"
            title="Rename"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(category.id)}
            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {category.children!.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddSubcategory={onAddSubcategory}
              onOpenSettings={onOpenSettings}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
