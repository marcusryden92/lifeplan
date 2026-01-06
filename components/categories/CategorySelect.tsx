"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import type { Category } from "@/types/prisma";
import { buildIndentedCategoryList } from "@/utils/categoryUtils";

interface CategorySelectProps {
  value: string;
  categories: Category[];
  onChange: (value: string) => void;
  includeNone?: boolean;
  noneLabel?: string;
  includeAll?: boolean;
  allLabel?: string;
  includeUncategorized?: boolean;
  uncategorizedLabel?: string;
  placeholder?: string;
  triggerClassName?: string;
}

export function CategorySelect({
  value,
  categories,
  onChange,
  includeNone = false,
  noneLabel = "No category",
  includeAll = false,
  allLabel = "All categories",
  includeUncategorized = false,
  uncategorizedLabel = "Uncategorized",
  placeholder = "Select category",
  triggerClassName,
}: CategorySelectProps) {
  const normalizedValue: string = value ?? "";
  const selectedCategory = categories.find((c) => c.id === normalizedValue);
  const isSpecial =
    normalizedValue === "none" ||
    normalizedValue === "all" ||
    normalizedValue === "uncategorized";

  const handleChange = (v: string) => {
    return onChange(v);
  };

  const indented = buildIndentedCategoryList(categories);

  return (
    <Select value={normalizedValue || undefined} onValueChange={handleChange}>
      <SelectTrigger className={triggerClassName}>
        {selectedCategory ? (
          <span className="inline-flex items-center">
            {selectedCategory.icon && (
              <span className="mr-2">{selectedCategory.icon}</span>
            )}
            <span>{selectedCategory.name}</span>
          </span>
        ) : isSpecial && normalizedValue ? (
          <span>
            {normalizedValue === "none"
              ? noneLabel
              : normalizedValue === "all"
                ? allLabel
                : uncategorizedLabel}
          </span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all" textValue={allLabel}>
            {allLabel}
          </SelectItem>
        )}
        {includeUncategorized && (
          <SelectItem value="uncategorized" textValue={uncategorizedLabel}>
            {uncategorizedLabel}
          </SelectItem>
        )}
        {includeNone && (
          <SelectItem value="none" textValue={noneLabel}>
            {noneLabel}
          </SelectItem>
        )}
        {indented.map((cat) => (
          <SelectItem key={cat.id} value={cat.id} textValue={cat.name}>
            <span className="inline-flex items-center">
              <span className="font-mono text-gray-400 mr-1 whitespace-pre">
                {cat.prefix}
              </span>
              {cat.icon && <span className="mr-2">{cat.icon}</span>}
              <span>{cat.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default CategorySelect;
