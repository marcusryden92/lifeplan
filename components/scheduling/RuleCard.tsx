"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Slider } from "@/components/ui/Slider";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { Strategy, StrategyRule } from "./types";

interface Props {
  strategy: Strategy;
  ruleType: { value: string; label: string };
  existing?: StrategyRule | undefined;
  onToggle: (ruleType: string, enabled: boolean) => void;
  onUpdate: (ruleId: string, updates: Partial<StrategyRule>) => void;
}

export function RuleCard({
  strategy,
  ruleType,
  existing,
  onToggle,
  onUpdate,
}: Props) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={!!existing}
              onCheckedChange={(c) => onToggle(ruleType.value, !!c)}
            />
            <div>
              <div className="font-medium">{ruleType.label}</div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {existing ? "Enabled" : "Disabled"}
          </div>
        </div>

        {existing && (
          <div className="mt-3 pl-10 space-y-3">
            <div>
              <Label>Importance</Label>
              <Slider
                value={[Math.round(existing.weight * 10)]}
                onValueChange={(v: number[]) =>
                  onUpdate(existing.id, { weight: v[0] / 10 })
                }
                min={0}
                max={10}
                step={1}
              />
            </div>
            {/* Additional specific controls handled in parent for simplicity */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
