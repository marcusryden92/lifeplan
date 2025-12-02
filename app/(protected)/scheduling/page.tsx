"use client";

import { BufferTimeSettings } from "@/components/scheduling/BufferTimeSettings";
import * as actions from "@/actions/scheduling";

export default function SchedulingPage() {
  return (
    <div className="pageContainer mx-auto py-8 max-w-3xl">
      <div className="space-y-2 mb-8">
        <h1 className="my-6 text-3xl font-bold">Scheduling</h1>
        <p className="text-muted-foreground">
          Configure how your calendar is automatically generated based on task
          priorities and deadlines.
        </p>
      </div>

      <BufferTimeSettings actions={actions} />
    </div>
  );
}
