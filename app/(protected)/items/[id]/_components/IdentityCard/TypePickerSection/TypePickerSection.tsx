"use client";

import type { PlannerType } from "@/generated/client";
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
            item.plannerType === "plan"
              ? "0"
              : item.plannerType === "task"
                ? "1"
                : "2"
          }
          aria-hidden="true"
        />
        {(["plan", "task", "goal"] as const).map((t) => (
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
