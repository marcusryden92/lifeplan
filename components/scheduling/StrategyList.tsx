"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Check, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

import { Strategy, StrategyRule } from "./types";

// Built-in default strategies to show when user has none
const BUILT_IN_STRATEGIES: Strategy[] = [
  {
    id: "__earliest",
    name: "Earliest Slot",
    description: "Prefer the earliest available time slots.",
    isActive: false,
    isDefault: false,
    rules: [],
  },
  {
    id: "__urgency",
    name: "Urgency",
    description: "Prefer slots based on task urgency and deadlines.",
    isActive: false,
    isDefault: false,
    rules: [],
  },
];

type ActionsModule = typeof import("@/actions/scheduling");

export const StrategyList = forwardRef<
  { refresh: () => void },
  {
    onSelect?: (strategy: Strategy) => void;
    actions: ActionsModule;
  }
>(({ actions, onSelect }, ref) => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      const data = await actions.fetchStrategiesForUser();
      setStrategies(data as Strategy[]);
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

  useImperativeHandle(ref, () => ({
    refresh: fetchStrategies,
  }));

  const toggleActive = async (strategyId: string, currentActive: boolean) => {
    setUpdatingId(strategyId);

    setStrategies((prev) =>
      prev.map((s) =>
        s.id === strategyId ? { ...s, isActive: !currentActive } : s
      )
    );

    try {
      await actions.updateStrategy({
        id: strategyId,
        isActive: !currentActive,
      });
    } catch (err) {
      console.error("Failed to toggle strategy:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update strategy"
      );
      await fetchStrategies();
    } finally {
      setUpdatingId(null);
    }
  };

  const setAsDefault = async (strategyId: string) => {
    setUpdatingId(strategyId);

    setStrategies((prev) =>
      prev.map((s) => ({ ...s, isDefault: s.id === strategyId }))
    );

    try {
      await actions.updateStrategy({ id: strategyId, isDefault: true });
    } catch (err) {
      console.error("Failed to set default:", err);
      setError(err instanceof Error ? err.message : "Failed to set default");
      await fetchStrategies();
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteStrategy = async (strategyId: string) => {
    if (!confirm("Are you sure you want to delete this strategy?")) return;

    setUpdatingId(strategyId);
    setStrategies((prev) => prev.filter((s) => s.id !== strategyId));

    try {
      await actions.deleteStrategy(strategyId);
    } catch (err) {
      console.error("Failed to delete strategy:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete strategy"
      );
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

  const displayStrategies =
    strategies.length === 0 ? BUILT_IN_STRATEGIES : strategies;

  return (
    <Card className="h-[80vh] flex flex-col lg:max-w-[300px]">
      <CardHeader>
        <CardTitle>Your Strategies</CardTitle>
        <CardDescription>
          Select which strategy to use for automatic scheduling
        </CardDescription>
      </CardHeader>
      <CardContent className={`p-4 flex-1`}>
        <div className="space-y-2 h-full overflow-auto">
          <ul className="divide-y">
            {displayStrategies
              .slice()
              .sort((a, b) =>
                a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1
              )
              .map((strategy) => (
                <li
                  key={strategy.id}
                  className={`py-2 flex items-center justify-between cursor-pointer ${
                    selectedId === strategy.id ? "bg-accent/5" : ""
                  }`}
                  onClick={() => {
                    setSelectedId(strategy.id);
                    onSelect?.(strategy as Strategy);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {strategy.name}
                      </span>
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
                  </div>

                  <div className="flex items-center gap-2 ml-4">
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
                </li>
              ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <div className="w-full">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-sm"
            onClick={async () => {
              const name = prompt("Strategy name:");
              if (!name) return;
              try {
                await actions.createStrategy({
                  name,
                  description: "",
                  isActive: false,
                  isDefault: false,
                  rules: [],
                });
                // refresh list after creation
                fetchStrategies();
              } catch (err) {
                console.error(err);
                alert(
                  err instanceof Error
                    ? err.message
                    : "Failed to create strategy"
                );
              }
            }}
          >
            + Add Strategy
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
});

StrategyList.displayName = "StrategyList";
