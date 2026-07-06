"use client";

import { space, radii } from "@/lib/theme";
import { useMemo } from "react";
import { Caption, CategoryBadge, Combobox } from "@/components/ui";
import { useItem } from "../../ItemContext";
import { fieldStack, fieldLabel } from "./CategorySection.css";

export function CategorySection() {
  const { item, category, categories, changeCategory } = useItem();

  const categoryOptions = useMemo(
    () => [
      { value: null, label: <Caption>No category</Caption> },
      ...categories.map((c) => ({
        value: c.id,
        label: (
          <span style={{ display: "inline-flex", alignItems: "center", gap: space["2"] }}>
            {c.color && (
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: radii["pill"],
                  background: c.color,
                  flexShrink: 0,
                }}
              />
            )}
            <span>{c.name}</span>
          </span>
        ),
      })),
    ],
    [categories],
  );

  // Subitems inherit the root's category — show it, but only the top-level
  // item owns the picker.
  if (item.parentId) {
    return (
      <div className={fieldStack}>
        <span className={fieldLabel}>Area</span>
        {category ? (
          <CategoryBadge color={category.color ?? "#888"}>
            {category.name}
          </CategoryBadge>
        ) : (
          <Caption>No category</Caption>
        )}
      </div>
    );
  }

  return (
    <div className={fieldStack}>
      <span className={fieldLabel}>Area</span>
      <Combobox
        value={item.categoryId ?? null}
        options={categoryOptions}
        onChange={(v) => changeCategory(v)}
        renderValue={() =>
          category ? (
            <CategoryBadge color={category.color ?? "#888"}>
              {category.name}
            </CategoryBadge>
          ) : (
            <Caption>No category</Caption>
          )
        }
        ariaLabel="Category"
      />
    </div>
  );
}
