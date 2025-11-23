"use client";

import { useState } from "react";
import { Calendar, Clock, Battery, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import type {
  TaskTypeEnum,
  PriorityLevel,
  EnergyLevel,
} from "@/prisma/generated/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";

interface TaskPreferences {
  taskType?: string;
  preferredDays: number[];
  avoidDays: number[];
  preferredStartTime?: string;
  preferredEndTime?: string;
  priority: string;
  energyLevel?: string;
  allowFlexibility: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const TASK_TYPES = [
  { value: "EXERCISE", label: "Exercise", icon: "🏃" },
  { value: "DEEP_WORK", label: "Deep Work", icon: "🧠" },
  { value: "ADMIN", label: "Administrative", icon: "📝" },
  { value: "MEETING", label: "Meeting", icon: "👥" },
  { value: "CREATIVE", label: "Creative Work", icon: "🎨" },
  { value: "ROUTINE", label: "Routine/Habit", icon: "🔄" },
  { value: "SOCIAL", label: "Social", icon: "🤝" },
];

const PRIORITY_LEVELS = [
  { value: "LOW", label: "Low", color: "bg-gray-500" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-500" },
  { value: "HIGH", label: "High", color: "bg-orange-500" },
  { value: "CRITICAL", label: "Critical", color: "bg-red-500" },
];

const ENERGY_LEVELS = [
  { value: "LOW", label: "Low Energy", description: "Light tasks, admin work" },
  { value: "MEDIUM", label: "Medium Energy", description: "Normal tasks" },
  { value: "HIGH", label: "High Energy", description: "Deep work, exercise" },
];

interface TaskPreferencesEditorProps {
  plannerId: string;
  initialPreferences?: Partial<TaskPreferences>;
  onSave?: (preferences: TaskPreferences) => void;
}

type ActionsModule = typeof import("@/actions/scheduling");

export function TaskPreferencesEditor({
  plannerId,
  initialPreferences,
  onSave,
  actions,
}: TaskPreferencesEditorProps & { actions?: ActionsModule }) {
  const [preferences, setPreferences] = useState<TaskPreferences>({
    preferredDays: initialPreferences?.preferredDays || [],
    avoidDays: initialPreferences?.avoidDays || [],
    priority: initialPreferences?.priority || "MEDIUM",
    allowFlexibility: initialPreferences?.allowFlexibility ?? true,
    ...initialPreferences,
  });

  const toggleDay = (day: number, type: "preferred" | "avoid") => {
    if (type === "preferred") {
      const days = preferences.preferredDays || [];
      setPreferences({
        ...preferences,
        preferredDays: days.includes(day)
          ? days.filter((d) => d !== day)
          : [...days, day],
      });
      return;
    }

    const days = preferences.avoidDays || [];
    setPreferences({
      ...preferences,
      avoidDays: days.includes(day)
        ? days.filter((d) => d !== day)
        : [...days, day],
    });
  };

  const handleSave = async () => {
    try {
      // Actions are required for saving preferences in the new architecture.
      if (!actions) throw new Error("Server actions not provided");

      const payload: {
        taskType?: TaskTypeEnum | null;
        preferredDays?: number[] | null;
        avoidDays?: number[] | null;
        preferredStartTime?: string | null;
        preferredEndTime?: string | null;
        priority?: PriorityLevel | null;
        energyLevel?: EnergyLevel | null;
        allowFlexibility?: boolean | null;
      } = {
        taskType: (preferences.taskType as TaskTypeEnum) ?? null,
        preferredDays: preferences.preferredDays?.length
          ? preferences.preferredDays
          : null,
        avoidDays: preferences.avoidDays?.length ? preferences.avoidDays : null,
        preferredStartTime: preferences.preferredStartTime ?? null,
        preferredEndTime: preferences.preferredEndTime ?? null,
        priority: (preferences.priority as PriorityLevel) ?? null,
        energyLevel: (preferences.energyLevel as EnergyLevel) ?? null,
        allowFlexibility: preferences.allowFlexibility ?? null,
      };

      await actions.upsertTaskPreferences(plannerId, payload);
      onSave?.({ ...preferences });
      alert("Preferences saved!");
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Task Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Task Type
          </CardTitle>
          <CardDescription>
            Categorize this task to apply type-specific scheduling rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={preferences.taskType}
            onValueChange={(value) =>
              setPreferences({ ...preferences, taskType: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select task type..." />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <span className="mr-2">{type.icon}</span>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Preferred Days */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Preferred Days
          </CardTitle>
          <CardDescription>
            Select which days you&apos;d prefer to schedule this task
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <Button
                key={day.value}
                variant={
                  preferences.preferredDays.includes(day.value)
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => toggleDay(day.value, "preferred")}
                className="w-16"
              >
                {day.short}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Avoid Days */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-destructive" />
            Avoid Days
          </CardTitle>
          <CardDescription>
            Select days you want to avoid scheduling this task
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <Button
                key={day.value}
                variant={
                  preferences.avoidDays.includes(day.value)
                    ? "destructive"
                    : "outline"
                }
                size="sm"
                onClick={() => toggleDay(day.value, "avoid")}
                className="w-16"
              >
                {day.short}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preferred Time Window */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Preferred Time Window
          </CardTitle>
          <CardDescription>
            Set a specific time range for scheduling this task
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={preferences.preferredStartTime || ""}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    preferredStartTime: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={preferences.preferredEndTime || ""}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    preferredEndTime: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {preferences.preferredStartTime && preferences.preferredEndTime && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                This task will be scheduled between{" "}
                <span className="font-medium text-foreground">
                  {preferences.preferredStartTime}
                </span>{" "}
                and{" "}
                <span className="font-medium text-foreground">
                  {preferences.preferredEndTime}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Level</CardTitle>
          <CardDescription>
            Higher priority tasks will be scheduled first
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {PRIORITY_LEVELS.map((level) => (
              <Button
                key={level.value}
                variant={
                  preferences.priority === level.value ? "default" : "outline"
                }
                onClick={() =>
                  setPreferences({ ...preferences, priority: level.value })
                }
                className="flex-1"
              >
                <Badge className={`mr-2 ${level.color}`} />
                {level.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Energy Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Battery className="w-5 h-5" />
            Energy Level Required
          </CardTitle>
          <CardDescription>
            Match task energy requirements with your peak hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ENERGY_LEVELS.map((level) => (
            <div
              key={level.value}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                preferences.energyLevel === level.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() =>
                setPreferences({ ...preferences, energyLevel: level.value })
              }
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{level.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {level.description}
                  </p>
                </div>
                {preferences.energyLevel === level.value && (
                  <div className="w-4 h-4 rounded-full bg-primary" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Flexibility Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Allow Flexibility</p>
              <p className="text-sm text-muted-foreground">
                Allow scheduling outside preferred times if necessary
              </p>
            </div>
            <Switch
              checked={preferences.allowFlexibility}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, allowFlexibility: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
