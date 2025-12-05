"use client";

import { BufferTimeSettings } from "@/components/scheduling/BufferTimeSettings";
import * as actions from "@/actions/scheduling";

export default function SchedulingPage() {
  return (
    <div className="pageContainer bg-white mx-auto py-8 w-full">
      <div className="flex flex-col ml-20 max-w-[600px]">
        <div className="space-y-2 mb-8">
          <h1 className="my-6 text-3xl font-bold">Scheduling Strategy</h1>
          <p className="text-muted-foreground">
            Configure how your calendar is automatically generated based on task
            priorities and deadlines.
          </p>
        </div>

        <BufferTimeSettings actions={actions} />
      </div>
    </div>
  );
}
