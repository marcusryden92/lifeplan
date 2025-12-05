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

      <Card>
        <CardHeader>
          <CardTitle>Scheduling Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Scheduling preferences will be added here soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
