"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";
import { Strategy, StrategyRule } from "./types";
import { RuleCard } from "./RuleCard";
import { RULE_TYPES } from "@/constants/scheduling";

interface Props {
  strategy: Strategy | null;
  onToggleActive: (id: string, current: boolean) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleRule: (ruleType: string, enabled: boolean) => void;
  onUpdateRule: (ruleId: string, updates: Partial<StrategyRule>) => void;
}

export function StrategyDetails({
  strategy,
  onToggleActive,
  onSetDefault,
  onDelete,
  onToggleRule,
  onUpdateRule,
}: Props) {
  if (!strategy)
    return (
      <Card className="h-full flex flex-col">
        <CardContent className="flex-1 overflow-auto px-4">
          <p className="text-muted-foreground">No strategies available</p>
        </CardContent>
      </Card>
    );

  return (
    <Card className="min-h-full w-full flex flex-col ">
      <CardHeader>
        <div className="flex items-start justify-between w-full">
          <div>
            <CardTitle>{strategy.name}</CardTitle>
            <CardDescription>{strategy.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={strategy.isActive ? "default" : "outline"}
              onClick={() => onToggleActive(strategy.id, strategy.isActive)}
            >
              {strategy.isActive ? "Active" : "Activate"}
            </Button>
            {!strategy.isSystemDefault && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSetDefault(strategy.id)}
              >
                Set as Default
              </Button>
            )}
            {!strategy.isSystemDefault && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(strategy.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 flex-1">
        <div className="space-y-4 h-full overflow-auto">
          {/* Name/Description and per-rule cards go here */}
          {RULE_TYPES.map((t) => {
            const existing = strategy.rules.find((r) => r.ruleType === t.value);
            return (
              <RuleCard
                key={t.value}
                strategy={strategy}
                ruleType={t}
                existing={existing}
                onToggle={(rt, enabled) => onToggleRule(rt, enabled)}
                onUpdate={(id, upd) => onUpdateRule(id, upd)}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
