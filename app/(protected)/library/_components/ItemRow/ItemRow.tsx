import { ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Caption, CategoryDot, TypeBadge } from "@/components/ui";
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
  cellChevron,
} from "../../page.css";

export function ItemRow({
  item,
  category,
  onClick,
  now,
}: {
  item: Planner;
  category?: Category;
  onClick: () => void;
  now: Date;
}) {
  const isOverdue = isItemOverdue(item, now);

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
      <div className={cellMuted}>{formatDurationCompact(item.duration)}</div>
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
          <span style={{ color: "var(--muted)" }}>—</span>
        )}
      </div>
      <div>
        <Caption>{statusLabel}</Caption>
      </div>
      <div className={cellChevron}>
        <ChevronRight size={14} strokeWidth={2} />
      </div>
    </div>
  );
}
