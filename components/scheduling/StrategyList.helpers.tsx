import type { Strategy } from "./types";

export async function fetchStrategies(): Promise<Strategy[]> {
  const r = await fetch("/api/scheduling/strategies");
  if (!r.ok) throw new Error("Failed to fetch strategies");
  return (await r.json()) as Strategy[];
}

export async function patchStrategy(
  patch: Partial<Strategy> & { id: string }
): Promise<Strategy> {
  const r = await fetch(`/api/scheduling/strategies`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error("Failed to patch strategy");
  return (await r.json()) as Strategy;
}

export async function deleteStrategyApi(strategyId: string): Promise<void> {
  const r = await fetch(`/api/scheduling/strategies`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: strategyId }),
  });
  if (!r.ok) throw new Error("Failed to delete strategy");
  // API may return body, but callers don't rely on it; treat as void
  return;
}
