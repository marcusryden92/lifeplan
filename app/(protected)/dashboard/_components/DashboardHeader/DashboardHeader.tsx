import Link from "next/link";
import { Button, Kbd } from "@/components/ui";
import { formatDurationCompact } from "@/utils/timeFormatting";
import type { DashboardSummary } from "../../_data/types";
import {
  headerRow,
  greeting,
  summaryLine,
  summaryStrong,
  summaryError,
  headerActions,
} from "./DashboardHeader.css";

type Props = {
  greetingText: string;
  dateText: string;
  summary: DashboardSummary;
  modKey: string;
  onCaptureClick: () => void;
};

export function DashboardHeader({
  greetingText,
  dateText,
  summary,
  modKey,
  onCaptureClick,
}: Props) {
  const plannedLabel =
    summary.plannedMinutes > 0
      ? formatDurationCompact(summary.plannedMinutes)
      : "0m";

  return (
    <div className={headerRow}>
      <div>
        <h1 className={greeting}>{greetingText}</h1>
        <div className={summaryLine}>
          <span className={summaryStrong}>{dateText}</span>
          {" · "}
          <span className={summaryStrong}>{summary.itemCount}</span>
          {summary.itemCount === 1 ? " thing on today" : " things on today"}
          {" · "}
          <span className={summaryStrong}>{plannedLabel}</span>
          {" planned"}
          {summary.overdueCount > 0 && (
            <>
              {" · "}
              <span className={summaryError}>
                {summary.overdueCount} overdue
              </span>
            </>
          )}
          {summary.pastDeadlineCount > 0 && (
            <>
              {" · "}
              {summary.pastDeadlineCount} scheduled past deadline
            </>
          )}
        </div>
      </div>
      <div className={headerActions}>
        <Button variant="glass" onClick={onCaptureClick}>
          <Kbd>{modKey}</Kbd>
          <Kbd>K</Kbd>
          capture
        </Button>
        <Link href="/calendar">
          <Button variant="solid">Open calendar →</Button>
        </Link>
      </div>
    </div>
  );
}
