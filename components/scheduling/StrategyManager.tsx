"use client";

import { Strategy } from "./types";
import { StrategyList } from "./StrategyList";
import { StrategyDetails } from "./StrategyDetails";

type ActionsModule = typeof import("@/actions/scheduling");

export function StrategyManager({ actions }: { actions: ActionsModule }) {
  // StrategyList will load strategies itself (or be passed data by server parent)
  const first: Strategy | null = null;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-1/3">
        <StrategyList actions={actions} />
      </div>
      <div className="w-full lg:w-2/3 max-h-[70vh] overflow-auto">
        <StrategyDetails
          strategy={first}
          actions={actions}
          onToggleActive={() => {}}
          onSetDefault={() => {}}
          onDelete={() => {}}
          onToggleRule={() => {}}
          onUpdateRule={() => {}}
        />
      </div>
    </div>
  );
}
