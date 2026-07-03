"use client";

import type { CoachForest } from "./plannerForestToJson";

export interface StreamChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamCoachFocus {
  rootId: string | null;
  itemId: string | null;
}

export interface StreamCoachArgs {
  currentForest: CoachForest;
  history: StreamChatMessage[];
  focus: StreamCoachFocus | null;
  categories: { id: string; name: string }[];
  today: string;
  signal?: AbortSignal;
  onText: (delta: string) => void;
  // Raw (possibly partial) propose_goals input plus its callIndex; the caller
  // normalizes and folds it against the turn-start working forest.
  onForest: (payload: { callIndex: number; proposal: unknown }) => void;
  // show_goals: display-only request to bring goals into the tree pane.
  onShow: (payload: { goalIds: string[]; all: boolean }) => void;
  // Server-side tool activity (e.g. the model fetching goal trees) — for a
  // progress hint while a tool round trip runs.
  onStatus?: (payload: { tool: string; count: number }) => void;
  onDone: (stopReason: string | null) => void;
  onError: (message: string) => void;
}

export async function streamCoach({
  currentForest,
  history,
  focus,
  categories,
  today,
  signal,
  onText,
  onForest,
  onShow,
  onStatus,
  onDone,
  onError,
}: StreamCoachArgs): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/coach/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentForest, history, focus, categories, today }),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    onError((err as Error).message);
    return;
  }

  if (!response.ok || !response.body) {
    const text = await safeReadText(response);
    onError(text || `HTTP ${response.status}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by blank lines.
      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        dispatchSseEvent(rawEvent, {
          onText,
          onForest,
          onShow,
          onStatus,
          onDone,
          onError,
        });
      }
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    onError((err as Error).message);
  } finally {
    reader.releaseLock();
  }
}

interface DispatchHandlers {
  onText: StreamCoachArgs["onText"];
  onForest: StreamCoachArgs["onForest"];
  onShow: StreamCoachArgs["onShow"];
  onStatus: StreamCoachArgs["onStatus"];
  onDone: StreamCoachArgs["onDone"];
  onError: StreamCoachArgs["onError"];
}

function dispatchSseEvent(raw: string, handlers: DispatchHandlers): void {
  let eventName: string | null = null;
  let dataLine = "";
  for (const line of raw.split("\n")) {
    if (line.startsWith("event: ")) eventName = line.slice(7).trim();
    else if (line.startsWith("data: ")) dataLine += line.slice(6);
  }
  if (!eventName || !dataLine) return;

  let data: unknown;
  try {
    data = JSON.parse(dataLine);
  } catch {
    return;
  }

  switch (eventName) {
    case "text":
      handlers.onText((data as { delta: string }).delta);
      break;
    case "forest": {
      const { callIndex } = data as { callIndex?: unknown };
      handlers.onForest({
        callIndex: typeof callIndex === "number" ? callIndex : 0,
        proposal: data,
      });
      break;
    }
    case "status": {
      const { tool, count } = data as { tool?: unknown; count?: unknown };
      handlers.onStatus?.({
        tool: typeof tool === "string" ? tool : "",
        count: typeof count === "number" ? count : 0,
      });
      break;
    }
    case "show": {
      const { goalIds, all } = data as { goalIds?: unknown; all?: unknown };
      handlers.onShow({
        goalIds: Array.isArray(goalIds)
          ? goalIds.filter((id): id is string => typeof id === "string")
          : [],
        all: all === true,
      });
      break;
    }
    case "done":
      handlers.onDone((data as { stopReason: string | null }).stopReason);
      break;
    case "error":
      handlers.onError((data as { message: string }).message);
      break;
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
