"use client";

import { FieldStack, Switch } from "@/components/ui";
import {
  SplittingFields,
  DEFAULT_SPLITTING_SETTINGS,
} from "@/components/tasks/SplittingFields";
import {
  parseTaskSplitting,
  serializeTaskSplitting,
  splitCompletedMinutes,
  type TaskSplittingSettings,
} from "@/utils/taskSplitting";
import { useItem } from "../../ItemContext";
import { splitGrid, toggleRow, toggleHint } from "./SplittingSection.css";

export function SplittingSection() {
  const { item, updateField } = useItem();

  // Splittable = a task the scheduler places as a single block. Plans are
  // fixed anchors and goals are containers (their leaf tasks get split, not the
  // container), so chunking is exposed on task-typed rows only. Goal subtree
  // leaves get the same control in the subtask EditDrawer.
  if (item.plannerType !== "task") return null;

  const settings = parseTaskSplitting(item.splitting);
  const completed = splitCompletedMinutes(item);

  const apply = (next: TaskSplittingSettings | null) => {
    // Disabling keeps completedSegments on the row — the segments go inert
    // (no events, no completion effect) but re-enabling restores the credit.
    updateField("splitting", next ? serializeTaskSplitting(next) : null);
  };

  return (
    <div className={splitGrid}>
      <FieldStack label="Split into chunks">
        <div className={toggleRow}>
          <Switch
            checked={settings !== null}
            onCheckedChange={(checked) =>
              apply(checked ? DEFAULT_SPLITTING_SETTINGS : null)
            }
            aria-label="Split into chunks"
          />
          {!settings && (
            <span className={toggleHint}>
              Schedule as flexible chunks instead of one block
            </span>
          )}
        </div>
      </FieldStack>
      {settings && (
        <SplittingFields
          settings={settings}
          duration={item.duration}
          completed={completed}
          onChange={apply}
        />
      )}
    </div>
  );
}
