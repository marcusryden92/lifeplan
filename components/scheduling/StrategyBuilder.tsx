"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Settings } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";

interface StrategyRule {
  id: string;
  ruleType: string;
  weight: number;
  config: Record<string, unknown>;
  order: number;
}

interface Strategy {
  id?: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  rules: StrategyRule[];
}

const RULE_TYPES = [
  { value: "URGENCY", label: "Urgency (Deadline-based)", icon: "🔴" },
  { value: "EARLIEST_SLOT", label: "Earliest Available Slot", icon: "⏰" },
  { value: "PREFERRED_TIME", label: "Preferred Time Windows", icon: "🕐" },
  { value: "ENERGY_LEVEL", label: "Energy Level Matching", icon: "⚡" },
  { value: "DAY_PREFERENCE", label: "Day-of-Week Preference", icon: "📅" },
  { value: "BUFFER_TIME", label: "Buffer Time Between Tasks", icon: "⏱️" },
];

export function StrategyBuilder({
  onStrategySaved,
  editingStrategy,
  onCancelEdit,
}: {
  onStrategySaved?: () => void;
  editingStrategy?: Strategy | null;
  onCancelEdit?: () => void;
}) {
  const [strategy, setStrategy] = useState<Strategy>({
    name: "",
    description: "",
    isActive: true,
    isDefault: false,
    rules: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load strategy when editing
  useEffect(() => {
    if (editingStrategy) {
      setStrategy(editingStrategy);
    } else {
      // Reset to empty when not editing
      setStrategy({
        name: "",
        description: "",
        isActive: true,
        isDefault: false,
        rules: [],
      });
    }
  }, [editingStrategy]);

  const addRule = () => {
    const newRule: StrategyRule = {
      id: `rule-${Date.now()}`,
      ruleType: "URGENCY",
      weight: 0.5, // Internal weight (0-1)
      config: {},
      order: strategy.rules.length,
    };
    setStrategy({ ...strategy, rules: [...strategy.rules, newRule] });
  };

  const updateRule = (ruleId: string, updates: Partial<StrategyRule>) => {
    setStrategy({
      ...strategy,
      rules: strategy.rules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      ),
    });
  };

  const removeRule = (ruleId: string) => {
    setStrategy({
      ...strategy,
      rules: strategy.rules.filter((rule) => rule.id !== ruleId),
    });
  };

  const saveStrategy = async () => {
    // Validate
    if (!strategy.name.trim()) {
      setError("Strategy name is required");
      return;
    }
    if (strategy.rules.length === 0) {
      setError("Add at least one rule to your strategy");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Weights are already stored internally as 0-1, so no conversion needed
      const isEditing = !!strategy.id;
      const response = await fetch("/api/scheduling/strategies", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(strategy),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to save strategy");
      }

      // Success!
      setSuccess(true);

      // Notify parent component to refresh the list
      if (onStrategySaved) {
        onStrategySaved();
      }

      // Reset form after 2 seconds
      setTimeout(() => {
        setStrategy({
          name: "",
          description: "",
          isActive: true,
          isDefault: false,
          rules: [],
        });
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to save strategy:", err);
      setError(err instanceof Error ? err.message : "Failed to save strategy");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {strategy.id ? "Edit" : "Create"} Scheduling Strategy
              </CardTitle>
              <CardDescription>
                Build a custom strategy to control how tasks are scheduled on
                your calendar
              </CardDescription>
            </div>
            {strategy.id && onCancelEdit && (
              <Button variant="ghost" onClick={onCancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strategy Name */}
          <div className="space-y-2">
            <Label htmlFor="strategy-name">Strategy Name</Label>
            <Input
              id="strategy-name"
              placeholder="My Morning Routine Strategy"
              value={strategy.name}
              onChange={(e) =>
                setStrategy({ ...strategy, name: e.target.value })
              }
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="strategy-description">Description</Label>
            <Input
              id="strategy-description"
              placeholder="Prioritize exercise in the morning and deep work in the afternoon..."
              value={strategy.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setStrategy({ ...strategy, description: e.target.value })
              }
            />
          </div>

          {/* Active & Default Toggles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                checked={strategy.isActive}
                onCheckedChange={(checked) =>
                  setStrategy({ ...strategy, isActive: checked })
                }
              />
              <Label>Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={strategy.isDefault}
                onCheckedChange={(checked) =>
                  setStrategy({ ...strategy, isDefault: checked })
                }
              />
              <Label>Set as Default</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scheduling Rules</CardTitle>
              <CardDescription>
                Add and configure rules that determine how tasks are scheduled
              </CardDescription>
            </div>
            <Button onClick={addRule} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {strategy.rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No rules yet. Click "Add Rule" to get started.
            </div>
          ) : (
            strategy.rules.map((rule) => (
              <Card key={rule.id} className="border-2">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-4">
                      {/* Rule Type Selection */}
                      <div className="space-y-2">
                        <Label>Rule Type</Label>
                        <Select
                          value={rule.ruleType}
                          onValueChange={(value) =>
                            updateRule(rule.id, { ruleType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RULE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <span className="mr-2">{type.icon}</span>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Weight Slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Importance</Label>
                          <span className="text-sm font-semibold text-primary">
                            {Math.round(rule.weight * 10)} / 10
                          </span>
                        </div>
                        <Slider
                          value={[Math.round(rule.weight * 10)]}
                          onValueChange={(value: number[]) => {
                            const displayValue = value[0];
                            const internalWeight = displayValue / 10; // Convert 0-10 to 0-1
                            updateRule(rule.id, {
                              weight: internalWeight,
                            });
                          }}
                          min={0}
                          max={10}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      {/* Rule-Specific Configuration */}
                      <RuleConfigEditor
                        ruleType={rule.ruleType}
                        config={rule.config}
                        onConfigChange={(config) =>
                          updateRule(rule.id, { config })
                        }
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRule(rule.id)}
                      className="ml-4"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="text-destructive">⚠️</div>
              <div>
                <p className="font-semibold text-destructive">
                  Error Saving Strategy
                </p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {success && (
        <Card className="border-green-500 bg-green-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="text-green-600">✓</div>
              <div>
                <p className="font-semibold text-green-600">
                  Strategy Saved Successfully
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your scheduling strategy has been saved and is ready to use.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveStrategy} size="lg" disabled={isSaving}>
          {isSaving ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-background border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Strategy
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Rule-specific configuration editor
function RuleConfigEditor({
  ruleType,
  config,
  onConfigChange,
}: {
  ruleType: string;
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}) {
  switch (ruleType) {
    case "PREFERRED_TIME":
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Input
              type="time"
              value={(config.startTime as string) || "09:00"}
              onChange={(e) =>
                onConfigChange({ ...config, startTime: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>End Time</Label>
            <Input
              type="time"
              value={(config.endTime as string) || "17:00"}
              onChange={(e) =>
                onConfigChange({ ...config, endTime: e.target.value })
              }
            />
          </div>
        </div>
      );

    case "BUFFER_TIME":
      return (
        <div className="space-y-2">
          <Label>Buffer Time (minutes)</Label>
          <Input
            type="number"
            min="0"
            max="60"
            value={(config.bufferMinutes as number) || 15}
            onChange={(e) =>
              onConfigChange({
                ...config,
                bufferMinutes: parseInt(e.target.value),
              })
            }
          />
        </div>
      );

    case "ENERGY_LEVEL":
      return (
        <div className="space-y-2">
          <Label>Peak Energy Hours</Label>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="time"
              placeholder="Start"
              value={(config.peakStart as string) || "09:00"}
              onChange={(e) =>
                onConfigChange({ ...config, peakStart: e.target.value })
              }
            />
            <Input
              type="time"
              placeholder="End"
              value={(config.peakEnd as string) || "12:00"}
              onChange={(e) =>
                onConfigChange({ ...config, peakEnd: e.target.value })
              }
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="text-sm text-muted-foreground italic">
          No additional configuration needed for this rule type
        </div>
      );
  }
}
