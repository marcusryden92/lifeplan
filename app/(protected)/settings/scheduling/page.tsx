import { StrategyManager } from "@/components/scheduling/StrategyManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import * as schedulingActions from "@/actions/scheduling";

export default function SchedulingSettingsPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Scheduling Settings</h1>
        <p className="text-muted-foreground">
          Configure how your tasks and habits are automatically scheduled
        </p>
      </div>

      <StrategyManager actions={schedulingActions} />
    </div>
  );
}
