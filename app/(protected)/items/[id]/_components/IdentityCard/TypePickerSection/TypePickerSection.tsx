"use client";

import type { PlannerType } from "@/lib/generated/db-client";
import { useItem } from "../../ItemContext";
import {
  fieldStack,
  fieldLabel,
  typePicker,
  typePickerThumb,
  typePickerBtn,
} from "./TypePickerSection.css";

export function TypePickerSection() {
  const { item, setPlannerType } = useItem();

  return (
    <div className={fieldStack}>
      <span className={fieldLabel}>Type</span>
      <div className={typePicker}>
        <span
          className={typePickerThumb}
          data-position={
            item.plannerType === "task"
              ? "0"
              : item.plannerType === "plan"
                ? "1"
                : "2"
          }
          aria-hidden="true"
        />
        {(["task", "plan", "goal"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={typePickerBtn}
            data-active={item.plannerType === t}
            onClick={() => setPlannerType(t as PlannerType)}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
