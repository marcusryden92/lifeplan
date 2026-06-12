"use client";

import { formatMinutesToHours } from "@/utils/taskArrayUtils";
import { useItem } from "./_components/ItemContext";
import { IdentityCard } from "./_components/IdentityCard";
import {
  NextOnCalendarCard,
  AIHelperCard,
  EngineNotesCard,
} from "./_components/SideCards";
import {
  overviewGrid,
  leftCol,
  rightCol,
  progressBlock,
  progressMeta,
  progressMetaStrong,
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
    completedSubtasks,
    totalSubtasks,
  } = useItem();
  const isGoal = item.plannerType === "goal";
  const areaColor = category?.color ?? "var(--lumen-accent-primary, #3b82f6)";
  const showProgress = isGoal && totalSubtasks > 0;

  return (
    <>
      <div className={progressBlock}>
        {showProgress && (
          <>
            <div className={progressMeta}>
              <span className={progressMetaStrong}>
                {completedSubtasks} of {totalSubtasks} subtasks
              </span>
              {" · "}
              {formatMinutesToHours(completedDuration)} out of{" "}
              {formatMinutesToHours(totalDuration)}
              {" · "}
              <span className={progressMetaStrong}>{pct}%</span>
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
          </>
        )}
      </div>

      <div className={overviewGrid}>
        <div className={leftCol}>
          <IdentityCard />
        </div>
        <div className={rightCol}>
          <NextOnCalendarCard />
          <AIHelperCard />
          <EngineNotesCard />
        </div>
      </div>
    </>
  );
}
