"use client";

import { StrategyManager } from "@/components/scheduling/StrategyManager";
import * as actions from "@/actions/scheduling";

export default function SchedulingPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Scheduling</h1>
        <p className="text-muted-foreground">
          Manage your scheduling strategies
        </p>
      </div>

      <StrategyManager actions={actions} />
    </div>
  );
}
