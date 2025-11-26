import type { StrategyRuleType } from "@/prisma/generated/client";
import type { Prisma } from "@/prisma/generated/client";

export interface StrategyRule {
  id: string;
  ruleType: StrategyRuleType;
  weight: number;
  config: Prisma.InputJsonValue;
  order: number;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  isSystemDefault?: boolean;
  rules: StrategyRule[];
}
