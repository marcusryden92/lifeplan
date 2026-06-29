import { ChevronRight } from "lucide-react";
import { Caption } from "@/components/ui";
import {
  formatDurationCompact,
  formatTimeOfDay,
} from "@/utils/timeFormatting";
import type { AgendaItem } from "../../_data/types";
import {
  agendaRow,
  agendaRowGrouped,
  agendaTimeCol,
  agendaTime,
  agendaDur,
  agendaTitle,
  agendaMeta,
  agendaMetaDimmer,
} from "../AgendaCard/AgendaCard.css";
import {
  agendaRowNow,
  agendaRowNext,
  agendaRowTravel,
  agendaTimeNow,
  agendaTimeNext,
  agendaTitleTravel,
  agendaWarn,
  agendaOverdue,
  agendaChevron,
} from "./AgendaItemRow.css";

type Props = {
  item: AgendaItem;
  onClick?: (plannerId: string) => void;
};

export function AgendaItemRow({ item, onClick }: Props) {
  const interactive = !item.travel && !!item.plannerId;
  const handleClick =
    interactive && item.plannerId
      ? () => onClick?.(item.plannerId as string)
      : undefined;

  const rowClass = [
    agendaRow,
    item.now ? agendaRowNow : "",
    item.next ? agendaRowNext : "",
    item.travel ? agendaRowTravel : "",
    agendaRowGrouped,
  ]
    .filter(Boolean)
    .join(" ");

  const showFixedCaption = item.kind === "plan";
  const hasMetaRow =
    !!item.where ||
    showFixedCaption ||
    item.warn ||
    item.overdue ||
    item.pastDeadline;

  const durLabel = item.now
    ? "NOW"
    : item.next
      ? "NEXT"
      : item.durationMinutes > 0
        ? formatDurationCompact(item.durationMinutes)
        : "0m";

  return (
    <div
      className={rowClass}
      onClick={handleClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick?.();
              }
            }
          : undefined
      }
    >
      <div className={agendaTimeCol}>
        <div className={agendaTime}>{formatTimeOfDay(item.start)}</div>
        <div
          className={`${agendaDur} ${
            item.now ? agendaTimeNow : item.next ? agendaTimeNext : ""
          }`}
        >
          {durLabel}
        </div>
      </div>

      <div>
        <div
          className={`${agendaTitle} ${item.travel ? agendaTitleTravel : ""}`}
        >
          {item.title}
        </div>
        {hasMetaRow && (
          <div className={agendaMeta}>
            {item.where && <Caption>{item.where}</Caption>}
            {showFixedCaption && (
              <Caption className={agendaMetaDimmer}>· fixed</Caption>
            )}
            {item.warn && <span className={agendaWarn}>LATE</span>}
            {item.overdue && <span className={agendaOverdue}>OVERDUE</span>}
            {item.pastDeadline && !item.overdue && (
              <span className={agendaOverdue}>PAST DEADLINE</span>
            )}
          </div>
        )}
      </div>

      {interactive ? (
        <span className={agendaChevron} aria-hidden>
          <ChevronRight size={16} strokeWidth={2} />
        </span>
      ) : (
        <span />
      )}
    </div>
  );
}
