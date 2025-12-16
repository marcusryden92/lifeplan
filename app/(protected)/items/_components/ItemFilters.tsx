"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import type { Category } from "@/types/prisma";
import type { ItemType } from "@/prisma/generated/client";

export type FilterState = {
  search: string;
  type: ItemType | "all";
  categoryId: string; // Can be a category ID, "all", or "uncategorized"
  status: "all" | "ready" | "not-ready" | "completed";
  sort: "newest" | "oldest" | "deadline" | "priority";
};

interface ItemFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  categories: Category[];
  itemCounts: {
    total: number;
    tasks: number;
    plans: number;
    goals: number;
  };
}

export function ItemFilters({
  filters,
  onFilterChange,
  categories,
  itemCounts,
}: ItemFiltersProps) {
  const hasActiveFilters =
    filters.search ||
    filters.type !== "all" ||
    filters.categoryId !== "all" ||
    filters.status !== "all";

  const clearFilters = () => {
    onFilterChange({
      search: "",
      type: "all",
      categoryId: "all",
      status: "all",
      sort: filters.sort,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={filters.search}
          onChange={(e) =>
            onFilterChange({ ...filters, search: e.target.value })
          }
          placeholder="Search items..."
          className="pl-10 h-11"
        />
        {filters.search && (
          <button
            onClick={() => onFilterChange({ ...filters, search: "" })}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type filter */}
        <Select
          value={filters.type}
          onValueChange={(v) =>
            onFilterChange({ ...filters, type: v as FilterState["type"] })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types ({itemCounts.total})</SelectItem>
            <SelectItem value="task">Tasks ({itemCounts.tasks})</SelectItem>
            <SelectItem value="plan">Plans ({itemCounts.plans})</SelectItem>
            <SelectItem value="goal">Goals ({itemCounts.goals})</SelectItem>
          </SelectContent>
        </Select>

        {/* Category filter */}
        <Select
          value={filters.categoryId}
          onValueChange={(v) => onFilterChange({ ...filters, categoryId: v })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="uncategorized">Uncategorized</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon && <span className="mr-2">{cat.icon}</span>}
                {cat.parentId ? `  └ ${cat.name}` : cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={filters.status}
          onValueChange={(v) =>
            onFilterChange({ ...filters, status: v as FilterState["status"] })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="not-ready">Not ready</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={filters.sort}
          onValueChange={(v) =>
            onFilterChange({ ...filters, sort: v as FilterState["sort"] })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="deadline">By deadline</SelectItem>
            <SelectItem value="priority">By priority</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
