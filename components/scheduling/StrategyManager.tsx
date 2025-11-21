"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Star,
  Check,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Clock,
  Calendar,
  Zap,
  CalendarDays,
  Timer,
} from "lucide-react";
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
import { Badge } from "@/components/ui/Badge";
import { Slider } from "@/components/ui/Slider";
import { Checkbox } from "@/components/ui/Checkbox";

interface StrategyRule {
  id: string;
  ruleType: string;
  weight: number;
  config: Record<string, unknown>;
  order: number;
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  isSystemDefault?: boolean; // Read-only system strategies
  rules: StrategyRule[];
}

const RULE_TYPES = [
  { value: "URGENCY", label: "Urgency (Deadline-based)", Icon: AlertCircle },
  { value: "EARLIEST_SLOT", label: "Earliest Available Slot", Icon: Clock },
  { value: "PREFERRED_TIME", label: "Preferred Time Windows", Icon: Calendar },
  { value: "ENERGY_LEVEL", label: "Energy Level Matching", Icon: Zap },
  {
    value: "DAY_PREFERENCE",
    label: "Day-of-Week Preference",
    Icon: CalendarDays,
  },
  { value: "BUFFER_TIME", label: "Buffer Time Between Tasks", Icon: Timer },
];

const DEFAULT_STRATEGIES = [
  {
    id: "default-balanced",
    name: "Balanced",
    description: "A balanced approach considering urgency and availability",
    isActive: false,
    isDefault: false,
    isSystemDefault: true,
    rules: [
      { id: "rule-1", ruleType: "URGENCY", weight: 0.6, config: {}, order: 0 },
      {
        id: "rule-2",
        ruleType: "EARLIEST_SLOT",
        weight: 0.4,
        config: {},
        order: 1,
      },
    ],
  },
  {
    id: "default-urgent",
    name: "Urgent First",
    description: "Prioritize tasks with approaching deadlines",
    isActive: false,
    isDefault: false,
    isSystemDefault: true,
    rules: [
      { id: "rule-3", ruleType: "URGENCY", weight: 0.9, config: {}, order: 0 },
      {
        id: "rule-4",
        ruleType: "EARLIEST_SLOT",
        weight: 0.1,
        config: {},
        order: 1,
      },
    ],
  },
  {
    id: "default-early",
    name: "Early Bird",
    description: "Schedule everything as early as possible",
    isActive: false,
    isDefault: false,
    isSystemDefault: true,
    rules: [
      {
        id: "rule-5",
        ruleType: "EARLIEST_SLOT",
        weight: 0.8,
        config: {},
        order: 0,
      },
      { id: "rule-6", ruleType: "URGENCY", weight: 0.2, config: {}, order: 1 },
    ],
  },
] as const;

export function StrategyManager() {
  const [customStrategies, setCustomStrategies] = useState<Strategy[]>([]);
  const [activeDefaults, setActiveDefaults] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Combine default and custom strategies
  const allStrategies = [
    ...DEFAULT_STRATEGIES.map((ds) => ({
      ...ds,
      isActive: activeDefaults.has(ds.id),
    })),
    ...customStrategies,
  ];

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/scheduling/strategies");
      if (!response.ok) throw new Error("Failed to fetch strategies");
      const data = (await response.json()) as Strategy[];

      // Separate custom strategies from defaults
      const customs = data.filter((s) => !s.id.startsWith("default-"));
      setCustomStrategies(customs);

      // Track which defaults are active
      const activeDefaultIds = new Set(
        data
          .filter((s) => s.id.startsWith("default-") && s.isActive)
          .map((s) => s.id)
      );
      setActiveDefaults(activeDefaultIds);

      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load strategies"
      );
    } finally {
      setLoading(false);
    }
  };

  const createCustomStrategy = async () => {
    try {
      const response = await fetch("/api/scheduling/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Strategy",
          description: "",
          isActive: allStrategies.filter((s) => s.isActive).length === 0,
          isDefault: false,
          rules: [],
        }),
      });

      if (!response.ok) throw new Error("Failed to create strategy");
      const newStrategy = (await response.json()) as Strategy;
      setCustomStrategies((prev) => [...prev, newStrategy]);
      setExpandedId(newStrategy.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create strategy"
      );
    }
  };

  const updateStrategy = async (id: string, updates: Partial<Strategy>) => {
    setSavingId(id);
    try {
      const response = await fetch("/api/scheduling/strategies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) throw new Error("Failed to update strategy");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update strategy"
      );
    } finally {
      setSavingId(null);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    // Check if it's a default strategy
    if (id.startsWith("default-")) {
      const newActiveDefaults = new Set(activeDefaults);
      if (currentActive) {
        newActiveDefaults.delete(id);
      } else {
        newActiveDefaults.add(id);
      }
      setActiveDefaults(newActiveDefaults);

      // Store preference (you could save to user preferences API here)
      localStorage.setItem(
        "activeDefaultStrategies",
        JSON.stringify(Array.from(newActiveDefaults))
      );
    } else {
      // Optimistic update for custom strategies
      setCustomStrategies((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: !currentActive } : s))
      );
      await updateStrategy(id, { isActive: !currentActive });
    }
  };

  const setAsDefault = async (id: string) => {
    // Only custom strategies can be set as default
    if (id.startsWith("default-")) return;

    // Optimistic update
    setCustomStrategies((prev) =>
      prev.map((s) => ({ ...s, isDefault: s.id === id }))
    );
    await updateStrategy(id, { isDefault: true });
  };

  const deleteStrategy = async (id: string) => {
    // Can't delete default strategies
    if (id.startsWith("default-")) return;

    if (!confirm("Are you sure you want to delete this strategy?")) return;

    setCustomStrategies((prev) => prev.filter((s) => s.id !== id));
    try {
      const response = await fetch("/api/scheduling/strategies", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error("Failed to delete strategy");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete strategy"
      );
      // Re-fetch on error to restore state
      fetchStrategies();
    }
  };

  const addRule = (strategyId: string) => {
    // Can't edit default strategies
    if (strategyId.startsWith("default-")) return;

    const strategy = allStrategies.find((s) => s.id === strategyId);
    if (!strategy) return;

    // Find first unused rule type
    const usedTypes = strategy.rules.map((r) => r.ruleType);
    const availableType = RULE_TYPES.find((t) => !usedTypes.includes(t.value));

    if (!availableType) {
      setError("All rule types are already in use");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const newRule: StrategyRule = {
      id: `rule-${Date.now()}`,
      ruleType: availableType.value,
      weight: 0.5,
      config: {},
      order: strategy.rules.length,
    };

    // Optimistic update
    setCustomStrategies((prev) =>
      prev.map((s) =>
        s.id === strategyId ? { ...s, rules: [...s.rules, newRule] } : s
      )
    );

    updateStrategy(strategyId, {
      rules: [...strategy.rules, newRule],
    });
  };

  const updateRule = (
    strategyId: string,
    ruleId: string,
    updates: Partial<StrategyRule>
  ) => {
    // Can't edit default strategies
    if (strategyId.startsWith("default-")) return;

    const strategy = allStrategies.find((s) => s.id === strategyId);
    if (!strategy) return;

    // Check for duplicate rule types
    if (updates.ruleType) {
      const duplicate = strategy.rules.some(
        (r) => r.id !== ruleId && r.ruleType === updates.ruleType
      );
      if (duplicate) {
        setError("This rule type is already in use");
        setTimeout(() => setError(null), 3000);
        return;
      }
    }

    const updatedRules = strategy.rules.map((rule) =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );

    // Optimistic update
    setCustomStrategies((prev) =>
      prev.map((s) => (s.id === strategyId ? { ...s, rules: updatedRules } : s))
    );

    updateStrategy(strategyId, { rules: updatedRules });
  };

  const removeRule = (strategyId: string, ruleId: string) => {
    // Can't edit default strategies
    if (strategyId.startsWith("default-")) return;

    const strategy = allStrategies.find((s) => s.id === strategyId);
    if (!strategy) return;

    const updatedRules = strategy.rules.filter((r) => r.id !== ruleId);

    // Optimistic update
    setCustomStrategies((prev) =>
      prev.map((s) => (s.id === strategyId ? { ...s, rules: updatedRules } : s))
    );

    updateStrategy(strategyId, { rules: updatedRules });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading strategies...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Scheduling Strategies</CardTitle>
          <CardDescription>
            Create and manage strategies to control how tasks are scheduled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {allStrategies.map((strategy) => (
            <Card
              key={strategy.id}
              className={`border-2 ${
                strategy.isActive
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-border"
              }`}
            >
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() =>
                          setExpandedId(
                            expandedId === strategy.id ? null : strategy.id
                          )
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {expandedId === strategy.id ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{strategy.name}</h4>
                          {strategy.isDefault && (
                            <Badge variant="default" className="text-xs">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Default
                            </Badge>
                          )}
                          {strategy.isActive && (
                            <Badge className="text-xs bg-green-600">
                              <Check className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>
                        {strategy.description && (
                          <p className="text-sm text-muted-foreground">
                            {strategy.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {strategy.rules.length} rule
                          {strategy.rules.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant={strategy.isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          toggleActive(strategy.id, strategy.isActive)
                        }
                        disabled={savingId === strategy.id}
                        className={
                          strategy.isActive
                            ? "bg-green-600 hover:bg-green-700 w-[85px]"
                            : "w-[85px]"
                        }
                      >
                        {strategy.isActive ? "Active" : "Activate"}
                      </Button>
                      {!strategy.isSystemDefault && (
                        <>
                          {!strategy.isDefault && strategy.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAsDefault(strategy.id)}
                              title="Set as default"
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteStrategy(strategy.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedId === strategy.id && (
                    <div className="pl-8 space-y-4 pt-3 border-t">
                      {/* Name & Description - Only for custom strategies */}
                      {!strategy.isSystemDefault && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>Strategy Name</Label>
                            <Input
                              value={strategy.name}
                              onChange={(e) => {
                                setCustomStrategies((prev) =>
                                  prev.map((s) =>
                                    s.id === strategy.id
                                      ? { ...s, name: e.target.value }
                                      : s
                                  )
                                );
                              }}
                              onBlur={() => {
                                updateStrategy(strategy.id, {
                                  name: strategy.name,
                                });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Description (Optional)</Label>
                            <Input
                              value={strategy.description}
                              onChange={(e) => {
                                setCustomStrategies((prev) =>
                                  prev.map((s) =>
                                    s.id === strategy.id
                                      ? { ...s, description: e.target.value }
                                      : s
                                  )
                                );
                              }}
                              onBlur={() => {
                                updateStrategy(strategy.id, {
                                  description: strategy.description,
                                });
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Rules */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Scheduling Rules</Label>
                          {!strategy.isSystemDefault && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addRule(strategy.id)}
                              disabled={
                                strategy.rules.length >= RULE_TYPES.length
                              }
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Rule
                            </Button>
                          )}
                        </div>

                        {strategy.rules.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No rules yet. Add a rule to define how tasks should
                            be scheduled.
                          </p>
                        ) : (
                          strategy.rules.map((rule) => {
                            const usedTypes = strategy.rules
                              .filter((r) => r.id !== rule.id)
                              .map((r) => r.ruleType);
                            const availableTypes = RULE_TYPES.filter(
                              (t) =>
                                t.value === rule.ruleType ||
                                !usedTypes.includes(t.value)
                            );

                            return (
                              <Card
                                key={rule.id}
                                className={`${
                                  strategy.isActive
                                    ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/10"
                                    : "border"
                                }`}
                              >
                                <CardContent className="pt-4 space-y-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 space-y-3">
                                      <div className="space-y-2">
                                        <Label>Rule Type</Label>
                                        <Select
                                          value={rule.ruleType}
                                          onValueChange={(value) =>
                                            updateRule(strategy.id, rule.id, {
                                              ruleType: value,
                                            })
                                          }
                                          disabled={strategy.isSystemDefault}
                                        >
                                          <SelectTrigger
                                            disabled={strategy.isSystemDefault}
                                          >
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {availableTypes.map((type) => {
                                              const IconComponent = type.Icon;
                                              return (
                                                <SelectItem
                                                  key={type.value}
                                                  value={type.value}
                                                >
                                                  <div className="flex items-center">
                                                    <IconComponent className="w-4 h-4 mr-2" />
                                                    {type.label}
                                                  </div>
                                                </SelectItem>
                                              );
                                            })}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {/* Rule-specific configuration */}
                                      {rule.ruleType === "DAY_PREFERENCE" && (
                                        <div className="space-y-2">
                                          <Label>Preferred Days</Label>
                                          <div className="grid grid-cols-2 gap-2">
                                            {[
                                              "Monday",
                                              "Tuesday",
                                              "Wednesday",
                                              "Thursday",
                                              "Friday",
                                              "Saturday",
                                              "Sunday",
                                            ].map((day) => (
                                              <div
                                                key={day}
                                                className="flex items-center space-x-2"
                                              >
                                                <Checkbox
                                                  id={`${rule.id}-${day}`}
                                                  checked={(
                                                    (rule.config
                                                      .preferredDays as string[]) ||
                                                    []
                                                  ).includes(day)}
                                                  onCheckedChange={(
                                                    checked
                                                  ) => {
                                                    if (
                                                      !strategy.isSystemDefault
                                                    ) {
                                                      const currentDays =
                                                        (rule.config
                                                          .preferredDays as string[]) ||
                                                        [];
                                                      const newDays = checked
                                                        ? [...currentDays, day]
                                                        : currentDays.filter(
                                                            (d) => d !== day
                                                          );
                                                      updateRule(
                                                        strategy.id,
                                                        rule.id,
                                                        {
                                                          config: {
                                                            ...rule.config,
                                                            preferredDays:
                                                              newDays,
                                                          },
                                                        }
                                                      );
                                                    }
                                                  }}
                                                  disabled={
                                                    strategy.isSystemDefault
                                                  }
                                                />
                                                <label
                                                  htmlFor={`${rule.id}-${day}`}
                                                  className="text-sm cursor-pointer"
                                                >
                                                  {day.slice(0, 3)}
                                                </label>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {rule.ruleType === "PREFERRED_TIME" && (
                                        <div className="space-y-2">
                                          <Label>Preferred Time Windows</Label>
                                          <div className="text-sm text-muted-foreground">
                                            Configure time windows (e.g., 9 AM -
                                            12 PM, 2 PM - 5 PM)
                                          </div>
                                          <div className="flex gap-2">
                                            <Input
                                              type="time"
                                              value={
                                                (rule.config
                                                  .startTime as string) ||
                                                "09:00"
                                              }
                                              onChange={(e) => {
                                                if (!strategy.isSystemDefault) {
                                                  updateRule(
                                                    strategy.id,
                                                    rule.id,
                                                    {
                                                      config: {
                                                        ...rule.config,
                                                        startTime:
                                                          e.target.value,
                                                      },
                                                    }
                                                  );
                                                }
                                              }}
                                              disabled={
                                                strategy.isSystemDefault
                                              }
                                            />
                                            <span className="self-center">
                                              to
                                            </span>
                                            <Input
                                              type="time"
                                              value={
                                                (rule.config
                                                  .endTime as string) || "17:00"
                                              }
                                              onChange={(e) => {
                                                if (!strategy.isSystemDefault) {
                                                  updateRule(
                                                    strategy.id,
                                                    rule.id,
                                                    {
                                                      config: {
                                                        ...rule.config,
                                                        endTime: e.target.value,
                                                      },
                                                    }
                                                  );
                                                }
                                              }}
                                              disabled={
                                                strategy.isSystemDefault
                                              }
                                            />
                                          </div>
                                        </div>
                                      )}

                                      {rule.ruleType === "ENERGY_LEVEL" && (
                                        <div className="space-y-2">
                                          <Label>
                                            Task Energy Levels to Prioritize
                                          </Label>
                                          <Select
                                            value={
                                              (rule.config
                                                .preferredEnergyLevel as string) ||
                                              "HIGH"
                                            }
                                            onValueChange={(value) => {
                                              if (!strategy.isSystemDefault) {
                                                updateRule(
                                                  strategy.id,
                                                  rule.id,
                                                  {
                                                    config: {
                                                      ...rule.config,
                                                      preferredEnergyLevel:
                                                        value,
                                                    },
                                                  }
                                                );
                                              }
                                            }}
                                            disabled={strategy.isSystemDefault}
                                          >
                                            <SelectTrigger
                                              disabled={
                                                strategy.isSystemDefault
                                              }
                                            >
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="HIGH">
                                                High Energy Tasks
                                              </SelectItem>
                                              <SelectItem value="MEDIUM">
                                                Medium Energy Tasks
                                              </SelectItem>
                                              <SelectItem value="LOW">
                                                Low Energy Tasks
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      )}

                                      {rule.ruleType === "BUFFER_TIME" && (
                                        <div className="space-y-2">
                                          <Label>
                                            Buffer Time Between Tasks (minutes)
                                          </Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            max="120"
                                            step="5"
                                            value={
                                              (rule.config
                                                .bufferMinutes as number) || 15
                                            }
                                            onChange={(e) => {
                                              if (!strategy.isSystemDefault) {
                                                updateRule(
                                                  strategy.id,
                                                  rule.id,
                                                  {
                                                    config: {
                                                      ...rule.config,
                                                      bufferMinutes:
                                                        parseInt(
                                                          e.target.value
                                                        ) || 0,
                                                    },
                                                  }
                                                );
                                              }
                                            }}
                                            disabled={strategy.isSystemDefault}
                                          />
                                        </div>
                                      )}

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
                                            if (!strategy.isSystemDefault) {
                                              updateRule(strategy.id, rule.id, {
                                                weight: value[0] / 10,
                                              });
                                            }
                                          }}
                                          min={0}
                                          max={10}
                                          step={1}
                                          minStepsBetweenThumbs={0}
                                          className={`w-full ${
                                            strategy.isSystemDefault
                                              ? "opacity-50 cursor-not-allowed"
                                              : ""
                                          }`}
                                          disabled={strategy.isSystemDefault}
                                        />
                                      </div>
                                    </div>
                                    {!strategy.isSystemDefault && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          removeRule(strategy.id, rule.id)
                                        }
                                      >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Custom Strategy Button */}
          <Button
            onClick={createCustomStrategy}
            variant="outline"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Custom Strategy
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
