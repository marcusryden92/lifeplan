import { ArrowRight, Check } from "lucide-react";
import { Button, Caption } from "@/components/ui";
import type { UncompletedItem } from "../../_data/types";
import type { FlashTone } from "../../_hooks/useFlashAction";
import {
  agendaRow,
  agendaRowGrouped,
  agendaTimeCol,
  agendaTime,
  agendaDur,
  agendaTitle,
  agendaMeta,
  agendaMetaDimmer,
} from "../agendaRow.css";
import {
  uncompletedDaysLabel,
  uncompletedActions,
  uncompletedRowFlashSuccess,
  uncompletedRowFlashInfo,
} from "./UncompletedItemRow.css";

type Props = {
  item: UncompletedItem;
  flash: FlashTone | null;
  onOpen: (plannerId: string) => void;
  onComplete: () => void;
  onPostpone: () => void;
};

export function UncompletedItemRow({
  item,
  flash,
  onOpen,
  onComplete,
  onPostpone,
}: Props) {
  const rowClass = [
    agendaRow,
    agendaRowGrouped,
    flash === "success" ? uncompletedRowFlashSuccess : "",
    flash === "info" ? uncompletedRowFlashInfo : "",
  ]
    .filter(Boolean)
    .join(" ");

  const open = () => onOpen(item.plannerId);

  return (
    <div
      className={rowClass}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
    >
      <div className={agendaTimeCol}>
        <div className={`${agendaTime} ${uncompletedDaysLabel}`}>
          {item.daysAgo === 0 ? "today" : `${item.daysAgo}d`}
        </div>
        <div className={agendaDur}>
          {item.daysAgo === 0 ? "missed" : "late"}
        </div>
      </div>

      <div>
        <div className={agendaTitle}>{item.title}</div>
        <div className={agendaMeta}>
          <Caption>{item.kind}</Caption>
          {item.categoryName && (
            <Caption className={agendaMetaDimmer}>
              · {item.categoryName}
            </Caption>
          )}
        </div>
      </div>

      <div className={uncompletedActions}>
        <Button
          variant="glass"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          aria-label="Mark complete"
          title="Mark complete"
        >
          Complete
          <Check size={13} strokeWidth={2.2} />
        </Button>
        <Button
          variant="glass"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onPostpone();
          }}
          aria-label="Postpone"
          title="Postpone"
        >
          Postpone
          <ArrowRight size={13} strokeWidth={2} />
        </Button>
      </div>
    </div>
  );
}
