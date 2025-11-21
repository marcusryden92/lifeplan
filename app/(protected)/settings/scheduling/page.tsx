"use client";

import { StrategyManager } from "@/components/scheduling/StrategyManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function SchedulingSettingsPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Scheduling Settings</h1>
        <p className="text-muted-foreground">
          Configure how your tasks and habits are automatically scheduled
        </p>
      </div>

      <StrategyManager />

      <Card>
        <CardHeader>
          <CardTitle>How Scheduling Strategies Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">
              What are Scheduling Strategies?
            </h3>
            <p className="text-sm text-muted-foreground">
              Strategies are collections of rules that determine how tasks get
              scheduled on your calendar. Each rule scores available time slots,
              and the highest-scoring slot wins.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Available Rule Types</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                <strong>Urgency:</strong> Prioritizes tasks with approaching
                deadlines
              </li>
              <li>
                <strong>Earliest Slot:</strong> Prefers scheduling tasks as soon
                as possible
              </li>
              <li>
                <strong>Preferred Time:</strong> Schedules within specific time
                windows (e.g., 9am-12pm)
              </li>
              <li>
                <strong>Energy Level:</strong> Matches high-energy tasks to your
                peak hours (morning/afternoon/evening)
              </li>
              <li>
                <strong>Day Preference:</strong> Prefers specific days of the
                week (e.g., exercise on Mon/Wed/Fri)
              </li>
              <li>
                <strong>Buffer Time:</strong> Adds padding between tasks to
                avoid back-to-back scheduling
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Note: Task-specific preferences (like &ldquo;I want THIS task on
              Tuesday at 2pm&rdquo;) are set on individual tasks in the Task
              Preferences editor, not here.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold">How Importance Works</h3>
            <p className="text-sm text-muted-foreground">
              Each rule has an importance value from 0 to 10. Higher values make
              that rule more influential in the final scheduling decision. For
              example, if &ldquo;Urgency&rdquo; is set to 10 and &ldquo;Earliest
              Slot&rdquo; is set to 3, the scheduler will strongly prefer
              scheduling urgent tasks first.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
