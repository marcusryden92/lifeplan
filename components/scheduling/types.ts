export interface StrategyRule {
  id: string;
  ruleType: string;
  weight: number;
  config: Record<string, unknown>;
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
