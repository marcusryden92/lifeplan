import { ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Caption, CategoryDot, TypeBadge, vars } from "@/components/ui";
import { isItemOverdue } from "@/utils/plannerStatus";
import { formatDurationCompact } from "@/utils/timeFormatting";
import { plannerTypeBadgeTone } from "@/utils/badgeTone";
import type { Planner, Category } from "@/types/prisma";
import {
  tableRow,
  cellTitle,
  titleText,
  cellMuted,
  cellOverdue,
  cellLocation,
  cellProgress,
  cellProgressPct,
  cellChevron,
} from "../../page.css";

export function ItemRow({
  item,
  category,
  goalProgress,
  remainingDuration,
  onClick,
  now,
}: {
  item: Planner;
  category?: Category;
  goalProgress?: number;
  remainingDuration?: number;
  onClick: () => void;
  now: Date;
}) {
  const isOverdue = isItemOverdue(item, now);

  const showProgressInstead =
    goalProgress != null && goalProgress > 0 && goalProgress < 1;
  const statusLabel = item.completedEndTime
    ? "Done"
    : item.isReady
      ? "Ready"
      : "Draft";

  return (
    <div className={tableRow} onClick={onClick} role="button">
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
      <div className={cellChevron}>
        <ChevronRight size={14} strokeWidth={2} />
      </div>
    </div>
  );
}
