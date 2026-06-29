import Link from "next/link";
import {
  Button,
  Caption,
  CategoryDot,
  Loader,
  vars,
} from "@/components/ui";
import { TYPE_COLOR } from "../../_constants";
import { useFlashAction } from "../../_hooks/useFlashAction";
import type {
  AgendaRow,
  DashboardSummary,
  UncompletedItem,
} from "../../_data/types";
import { AgendaItemRow } from "../AgendaItemRow";
import { UncompletedItemRow } from "../UncompletedItemRow";
import {
  leftCard,
  leftCardHeader,
  leftCardTitle,
  agendaList,
  agendaRows,
  agendaEmpty,
  agendaSection,
  agendaSectionHeader,
  agendaSectionHeaderText,
  agendaSectionHeaderCount,
  agendaGroup,
  agendaGroupHeader,
  agendaGroupHeaderText,
} from "./AgendaCard.css";

type Props = {
  isLoaded: boolean;
  hasAnyAgenda: boolean;
  uncompleted: UncompletedItem[];
  agendaRowsBuilt: AgendaRow[];
  summary: DashboardSummary;
  onOpenItem: (plannerId: string) => void;
  onCompleteUncompleted: (plannerId: string) => void;
  onPostponeUncompleted: (plannerId: string) => void;
};

export function AgendaCard({
  isLoaded,
  hasAnyAgenda,
  uncompleted,
  agendaRowsBuilt,
  summary,
  onOpenItem,
  onCompleteUncompleted,
  onPostponeUncompleted,
}: Props) {
  const flash = useFlashAction();

  return (
    <div className={leftCard}>
      <div className={leftCardHeader}>
        <h2 className={leftCardTitle}>Agenda</h2>
        <Link href="/calendar">
          <Button variant="glass" size="sm">
            Full week →
          </Button>
        </Link>
      </div>
      <div className={agendaList}>
        <div className={agendaRows}>
          {!isLoaded ? (
            <div className={agendaEmpty}>
              <Loader size="md" label="Loading today's agenda" />
            </div>
          ) : !hasAnyAgenda ? (
            <div className={agendaEmpty}>
              <Caption>Nothing scheduled for today.</Caption>
            </div>
          ) : (
            <>
              {uncompleted.length > 0 && (
                <div className={agendaSection}>
                  <div
                    className={agendaSectionHeader}
                    style={{
                      borderBottom: `2px solid ${vars.status.success}`,
                    }}
                  >
                    <span className={agendaSectionHeaderText}>
                      Uncompleted
                    </span>
                    <span className={agendaSectionHeaderCount}>
                      {uncompleted.length}{" "}
                      {uncompleted.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  {uncompleted.map((item) => (
                    <UncompletedItemRow
                      key={item.id}
                      item={item}
                      flash={flash.toneFor(item.id)}
                      onOpen={onOpenItem}
                      onComplete={() =>
                        flash.run(item.id, "success", () =>
                          onCompleteUncompleted(item.plannerId),
                        )
                      }
                      onPostpone={() =>
                        flash.run(item.id, "info", () =>
                          onPostponeUncompleted(item.plannerId),
                        )
                      }
                    />
                  ))}
                </div>
              )}

              {agendaRowsBuilt.length > 0 && (
                <div className={agendaSection}>
                  <div
                    className={agendaSectionHeader}
                    style={{
                      borderBottom: `2px solid ${vars.status.info}`,
                    }}
                  >
                    <span className={agendaSectionHeaderText}>Today</span>
                    <span className={agendaSectionHeaderCount}>
                      {summary.itemCount}{" "}
                      {summary.itemCount === 1 ? "item" : "items"}
                    </span>
                  </div>
                  {agendaRowsBuilt.map((row, i) => {
                    const headerColor = TYPE_COLOR[row.header.kind];
                    const parts: string[] = [row.header.kind.toUpperCase()];
                    if (row.header.categoryName) {
                      parts.push(row.header.categoryName);
                    }
                    if (row.items.length > 1) {
                      parts.push(`${row.items.length} items`);
                    }
                    return (
                      <div
                        key={`group-${i}-${row.items[0].id}`}
                        className={agendaGroup}
                      >
                        <div className={agendaGroupHeader}>
                          <CategoryDot
                            color={headerColor}
                            size={7}
                            glow={false}
                          />
                          <span className={agendaGroupHeaderText}>
                            {parts.join(" · ")}
                          </span>
                        </div>
                        {row.items.map((item) => (
                          <AgendaItemRow
                            key={item.id}
                            item={item}
                            onClick={onOpenItem}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
