"use client";

import { StrategyManager } from "@/components/scheduling/StrategyManager";
import * as actions from "@/actions/scheduling";

export default function SchedulingPage() {
  return (
    <div className="pageContainer mx-auto py-8">
      <div className="space-y-2">
        <h1 className="my-6 text-3xl font-bold">Scheduling</h1>
      </div>

      <StrategyManager actions={actions} />
    </div>
  );
}
