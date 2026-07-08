"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { FolderOpen, Palette, SlidersHorizontal, Trash2, X } from "lucide-react";
import { CategoryDot } from "@/components/ui";
import { pillBtn, popover as popoverRecipe } from "@/lib/theme";
import { CALENDAR_COLOR_GROUPS } from "@/data/calendarColors";
import { buildCategoryTree, type CategoryNode } from "@/utils/categoryUtils";
import type { Category } from "@/types/prisma";
import {
  bar,
  countLabel,
  barDivider,
  barBtn,
  escHint,
  menu,
  menuItem,
  menuItemMuted,
  swatchGroup,
  swatch,
  priorityRow,
  priorityPill,
} from "./BulkActionBar.css";

type MenuKey = "category" | "color" | "priority";

function flattenTree(
  nodes: CategoryNode[],
  depth: number,
  out: Array<{ category: Category; depth: number }>,
) {
  for (const node of nodes) {
    out.push({ category: node, depth });
    flattenTree(node.children, depth + 1, out);
  }
}

export function BulkActionBar({
  count,
  categories,
  onAssignCategory,
  onSetColor,
  onSetPriority,
  onDelete,
  onClear,
}: {
  count: number;
  categories: Category[];
  onAssignCategory: (categoryId: string | null) => void;
  onSetColor: (color: string) => void;
  onSetPriority: (priority: number) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const barBtnClass = `${pillBtn({ variant: "glass", size: "sm" })} ${barBtn}`;

  const flatCategories = useMemo(() => {
    const out: Array<{ category: Category; depth: number }> = [];
    flattenTree(buildCategoryTree(categories), 0, out);
    return out;
  }, [categories]);

  const menuProps = (key: MenuKey) => ({
    open: openMenu === key,
    onOpenChange: (next: boolean) => setOpenMenu(next ? key : null),
  });

  const contentProps = {
    side: "top" as const,
    align: "center" as const,
    sideOffset: 8,
    collisionPadding: 8,
  };

  return (
    <div className={bar} role="toolbar" aria-label="Bulk actions">
      <span className={countLabel}>{count} selected</span>
      <span className={barDivider} aria-hidden />

      <Popover.Root {...menuProps("category")}>
        <Popover.Trigger asChild>
          <button type="button" className={barBtnClass}>
            <FolderOpen size={13} strokeWidth={2} aria-hidden />
            Category
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className={popoverRecipe({ size: "sm" })}
            aria-label="Assign category"
            {...contentProps}
          >
            <div className={menu}>
              <button
                type="button"
                className={`${menuItem} ${menuItemMuted}`}
                onClick={() => {
                  onAssignCategory(null);
                  setOpenMenu(null);
                }}
              >
                No category
              </button>
              {flatCategories.map(({ category, depth }) => (
                <button
                  key={category.id}
                  type="button"
                  className={menuItem}
                  style={{ paddingLeft: 8 + depth * 14 }}
                  onClick={() => {
                    onAssignCategory(category.id);
                    setOpenMenu(null);
                  }}
                >
                  {category.color && (
                    <CategoryDot color={category.color} size={8} glow={false} />
                  )}
                  {category.name}
                </button>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Popover.Root {...menuProps("color")}>
        <Popover.Trigger asChild>
          <button type="button" className={barBtnClass}>
            <Palette size={13} strokeWidth={2} aria-hidden />
            Color
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className={popoverRecipe({ size: "sm" })}
            aria-label="Set color"
            {...contentProps}
          >
            {CALENDAR_COLOR_GROUPS.map((group) => (
              <div key={group.name} className={swatchGroup}>
                {group.colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={swatch}
                    style={{ background: color }}
                    title={color}
                    aria-label={`Set color to ${color}`}
                    onClick={() => {
                      onSetColor(color);
                      setOpenMenu(null);
                    }}
                  />
                ))}
              </div>
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Popover.Root {...menuProps("priority")}>
        <Popover.Trigger asChild>
          <button type="button" className={barBtnClass}>
            <SlidersHorizontal size={13} strokeWidth={2} aria-hidden />
            Priority
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className={popoverRecipe({ size: "sm" })}
            aria-label="Set priority"
            {...contentProps}
          >
            <div className={priorityRow}>
              {Array.from({ length: 11 }).map((_, p) => (
                <button
                  key={p}
                  type="button"
                  className={priorityPill}
                  aria-label={`Priority ${p}`}
                  onClick={() => {
                    onSetPriority(p);
                    setOpenMenu(null);
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <button
        type="button"
        className={pillBtn({ variant: "danger", size: "sm" })}
        onClick={onDelete}
      >
        <Trash2 size={13} strokeWidth={2} aria-hidden />
        Delete
      </button>

      <span className={barDivider} aria-hidden />
      <span className={escHint}>esc to clear</span>
      <button
        type="button"
        className={barBtnClass}
        aria-label="Clear selection"
        onClick={onClear}
      >
        <X size={13} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
