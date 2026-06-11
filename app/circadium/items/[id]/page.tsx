"use client";

import { format } from "date-fns";
import { formatMinutesToHours } from "@/utils/taskArrayUtils";
import { useItem } from "./_components/ItemContext";
import { IdentityCard } from "./_components/IdentityCard";
import {
  NextOnCalendarCard,
  AIHelperCard,
  EngineNotesCard,
  WhyTheseSubtasksCard,
} from "./_components/SideCards";
import {
  overviewGrid,
  leftCol,
  rightCol,
  progressBlock,
  progressHeadRow,
  progressPercent,
  progressNum,
  progressNumPct,
  progressMeta,
  progressDeadline,
  progressTrack,
  progressFill,
  progressTick,
} from "./page.css";

export default function ItemOverviewPage() {
  const {
    item,
    category,
    pct,
    totalDuration,
    completedDuration,
    totalSubtasks,
  } = useItem();
  const isGoal = item.plannerType === "goal";
  const areaColor = category?.color ?? "var(--lumen-accent-primary, #3b82f6)";

  return (
    <>
      {isGoal && totalSubtasks > 0 && (
        <div className={progressBlock}>
          <div className={progressHeadRow}>
            <div className={progressPercent}>
              <span className={progressNum}>
                {pct}
                <span className={progressNumPct}>{"%"}</span>
              </span>
              <span className={progressMeta}>
                {formatMinutesToHours(completedDuration)} of{" "}
                {formatMinutesToHours(totalDuration)}
              </span>
            </div>
            {item.deadline && (
              <span className={progressDeadline}>
                by {format(new Date(item.deadline), "MMM d, yyyy")}
              </span>
            )}
          </div>
          <div className={progressTrack}>
            <div
              className={progressFill}
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${areaColor}, color-mix(in srgb, ${areaColor} 80%, transparent))`,
              }}
            />
            {Array.from({ length: totalSubtasks - 1 }).map((_, i) => (
              <span
                key={i}
                className={progressTick}
                style={{
                  left: `${((i + 1) / totalSubtasks) * 100}%`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className={overviewGrid}>
        <div className={leftCol}>
          <IdentityCard />
        </div>
        <div className={rightCol}>
          <NextOnCalendarCard />
          <AIHelperCard />
          <EngineNotesCard />
          <WhyTheseSubtasksCard />
        </div>
      </div>
    </>
  );
}
