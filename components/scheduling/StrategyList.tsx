"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Check, Trash2, Star, Edit } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

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
  rules: StrategyRule[];
}

export const StrategyList = forwardRef<
  { refresh: () => void },
  { onEdit?: (strategy: Strategy) => void }
>((props, ref) => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/scheduling/strategies");
      if (!response.ok) {
        throw new Error("Failed to fetch strategies");
      }
      const data = (await response.json()) as Strategy[];
      setStrategies(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load strategies"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  // Expose refresh method to parent via ref
  useImperativeHandle(ref, () => ({
    refresh: fetchStrategies,
  }));

  const toggleActive = async (strategyId: string, currentActive: boolean) => {
    setUpdatingId(strategyId);

    // Optimistic update
    setStrategies((prev) =>
      prev.map((s) =>
        s.id === strategyId ? { ...s, isActive: !currentActive } : s
      )
    );

    try {
      const response = await fetch(`/api/scheduling/strategies`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: strategyId,
          isActive: !currentActive,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update strategy");
      }
    } catch (err) {
      console.error("Failed to toggle strategy:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update strategy"
      );
      // Revert on error
      await fetchStrategies();
    } finally {
      setUpdatingId(null);
    }
  };

  const setAsDefault = async (strategyId: string) => {
    setUpdatingId(strategyId);

    // Optimistic update
    setStrategies((prev) =>
      prev.map((s) => ({
        ...s,
        isDefault: s.id === strategyId,
      }))
    );

    try {
      const response = await fetch(`/api/scheduling/strategies`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: strategyId,
          isDefault: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to set default strategy");
      }
    } catch (err) {
      console.error("Failed to set default:", err);
      setError(err instanceof Error ? err.message : "Failed to set default");
      // Revert on error
      await fetchStrategies();
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteStrategy = async (strategyId: string) => {
    if (!confirm("Are you sure you want to delete this strategy?")) {
      return;
    }

    setUpdatingId(strategyId);

    // Optimistic update
    setStrategies((prev) => prev.filter((s) => s.id !== strategyId));

    try {
      const response = await fetch(`/api/scheduling/strategies`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: strategyId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete strategy");
      }
    } catch (err) {
      console.error("Failed to delete strategy:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete strategy"
      );
      // Revert on error
      await fetchStrategies();
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Strategies</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading strategies...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Strategies</CardTitle>
        <CardDescription>
          Select which strategy to use for automatic scheduling
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {strategies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No strategies created yet. Create one below to get started.
          </p>
        ) : (
          strategies.map((strategy) => (
            <Card
              key={strategy.id}
              className={`border-2 ${
                strategy.isActive
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{strategy.name}</h4>
                      {strategy.isDefault && (
                        <Badge variant="default" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Default
                        </Badge>
                      )}
                      {strategy.isActive && (
                        <Badge variant="outline" className="text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    {strategy.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {strategy.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {strategy.rules.length} rule
                      {strategy.rules.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={strategy.isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        toggleActive(strategy.id, strategy.isActive)
                      }
                      disabled={updatingId === strategy.id}
                    >
                      {updatingId === strategy.id ? (
                        <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                      ) : strategy.isActive ? (
                        "Deactivate"
                      ) : (
                        "Activate"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => props.onEdit?.(strategy)}
                      title="Edit strategy"
                      disabled={updatingId === strategy.id}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!strategy.isDefault && strategy.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAsDefault(strategy.id)}
                        title="Set as default"
                        disabled={updatingId === strategy.id}
                      >
                        {updatingId === strategy.id ? (
                          <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Star className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteStrategy(strategy.id)}
                      disabled={updatingId === strategy.id}
                    >
                      {updatingId === strategy.id ? (
                        <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
});

StrategyList.displayName = "StrategyList";
