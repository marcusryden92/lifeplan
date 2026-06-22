"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useListKeyboardNav } from "@/hooks/useListKeyboardNav";
import type { Prediction } from "../../_hooks/usePlaceSearch";
import {
  predictions,
  predictionRow,
  predictionRowActive,
  predictionMain,
  predictionSub,
} from "./PredictionsList.css";

interface PredictionsListHandle {
  visible: boolean;
  onInputKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  node: ReactNode;
}

// The list lives next to its trigger input. The hook bundles keyboard nav
// (ArrowUp/Down/Enter) with the rendered overlay so the caller only wires
// onInputKeyDown to the input and drops `node` next to it.
export function usePredictionsList(
  items: Prediction[],
  onSelect: (p: Prediction) => void,
): PredictionsListHandle {
  const visible = items.length > 0;
  const keyboardNav = useListKeyboardNav<Prediction>(
    visible ? items : [],
    onSelect,
  );

  const node: ReactNode = visible ? (
    <div className={predictions} ref={keyboardNav.containerRef}>
      {items.map((p, i) => (
        <button
          key={p.placeId}
          type="button"
          data-knav-index={i}
          className={`${predictionRow} ${
            keyboardNav.activeIndex === i ? predictionRowActive : ""
          }`}
          onMouseEnter={() => keyboardNav.setActiveIndex(i)}
          onClick={() => onSelect(p)}
        >
          <span className={predictionMain}>{p.mainText}</span>
          <span className={predictionSub}>{p.secondaryText}</span>
        </button>
      ))}
    </div>
  ) : null;

  return {
    visible,
    onInputKeyDown: keyboardNav.onKeyDown,
    node,
  };
}
