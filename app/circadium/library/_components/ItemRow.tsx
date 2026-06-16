import { ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Caption, TypeBadge } from "@/components/ui";
import { startOfDay } from "@/utils/dateUtils";
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
} from "../page.css";

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
  const isOverdue =
    item.deadline &&
    new Date(item.deadline) < startOfDay(now) &&
    !item.completedEndTime;

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
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: category.color,
                  flexShrink: 0,
                }}
              />
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
