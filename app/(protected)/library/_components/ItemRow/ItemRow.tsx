import { useState } from "react";
import { Check, ChevronRight, MoreHorizontal, Trash2 } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { format } from "date-fns";
import { Caption, CategoryDot, TypeBadge, vars } from "@/components/ui";
import { popover as popoverRecipe } from "@/lib/theme";
import { isItemOverdue } from "@/utils/plannerStatus";
import { plannerCompletedEnd } from "@/utils/plannerCompletion";
import { formatDurationCompact } from "@/utils/timeFormatting";
import { plannerTypeBadgeTone } from "@/utils/badgeTone";
import type { Planner, Category } from "@/types/prisma";
import {
  tableRow,
  tableRowSelected,
  cellCheck,
  rowCheckbox,
  cellTitle,
  titleText,
  cellMuted,
  cellOverdue,
  cellLocation,
  cellProgress,
  cellProgressPct,
  rowActions,
  rowMenuBtn,
  rowMenu,
  rowMenuItem,
  rowMenuItemDanger,
} from "../../page.css";

export function ItemRow({
  item,
  category,
  goalProgress,
  remainingDuration,
  onClick,
  now,
  selected,
  onToggleSelect,
  onDelete,
}: {
  item: Planner;
  category?: Category;
  goalProgress?: number;
  remainingDuration?: number;
  onClick: () => void;
  now: Date;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOverdue = isItemOverdue(item, now);

  const showProgressInstead =
    goalProgress != null && goalProgress > 0 && goalProgress < 1;
  const statusLabel = plannerCompletedEnd(item)
    ? "Done"
    : item.isReady
      ? "Ready"
      : "Draft";

  return (
    <div
      className={`${tableRow} ${selected ? tableRowSelected : ""}`}
      onClick={onClick}
      role="button"
    >
      <div className={cellCheck} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select ${item.title}`}
          data-checked={selected ? "true" : undefined}
          className={rowCheckbox}
          onClick={onToggleSelect}
        >
          {selected && <Check size={11} strokeWidth={3} aria-hidden />}
        </button>
      </div>
      <div className={cellTitle}>
        <span className={titleText}>{item.title}</span>
      </div>
      <div>
        <TypeBadge tone={plannerTypeBadgeTone(item.plannerType)}>
          {item.plannerType}
        </TypeBadge>
      </div>
      <div className={cellMuted}>
        {remainingDuration != null
          ? remainingDuration > 0
            ? formatDurationCompact(remainingDuration)
            : "—"
          : formatDurationCompact(item.duration)}
      </div>
      <div className={cellMuted}>{item.priority}</div>
      <div className={`${cellMuted} ${isOverdue ? cellOverdue : ""}`}>
        {item.deadline ? format(new Date(item.deadline), "MMM d, yyyy") : "—"}
      </div>
      <div className={cellLocation}>
        {category ? (
          <>
            {category.color && (
              <CategoryDot color={category.color} size={8} glow={false} />
            )}
            <span
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {category.name}
            </span>
          </>
        ) : (
          <span style={{ color: vars.muted }}>—</span>
        )}
      </div>
      <div className={cellProgress}>
        {showProgressInstead ? (
          <Caption className={cellProgressPct}>
            {Math.round(goalProgress * 100)}%
          </Caption>
        ) : (
          <Caption>{statusLabel}</Caption>
        )}
      </div>
      <div className={rowActions}>
        <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={rowMenuBtn}
              aria-label={`Actions for ${item.title}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={14} strokeWidth={2} />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className={popoverRecipe({ size: "sm" })}
              side="bottom"
              align="end"
              sideOffset={4}
              collisionPadding={8}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={rowMenu}>
                <button
                  type="button"
                  className={`${rowMenuItem} ${rowMenuItemDanger}`}
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                >
                  <Trash2 size={13} strokeWidth={2} aria-hidden />
                  Delete
                </button>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <ChevronRight size={14} strokeWidth={2} />
      </div>
    </div>
  );
}
