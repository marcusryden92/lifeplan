"use client";

import type { DraftForest } from "./plannerForestToJson";
import {
  normalizeDraftTemplates,
  type DraftTemplate,
} from "./draftTemplates";
import {
  normalizeDraftWindowsState,
  type DraftWindowsState,
} from "./draftWindows";

export interface StreamChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Server-side cap (route rejects longer histories). Persistent conversations
// can outgrow it, so send only the trailing window.
const MAX_HISTORY_MESSAGES = 40;

export interface StreamDraftFocus {
  rootId: string | null;
  itemId: string | null;
}

export interface StreamDraftCategory {
  id: string;
  name: string;
  isStrict: boolean;
  useTimeWindows: boolean;
  timeSlots: { id: string; day: number; startTime: string; endTime: string }[];
}

export interface StreamDraftArgs {
  currentForest: DraftForest;
  currentTemplates: DraftTemplate[];
  history: StreamChatMessage[];
  focus: StreamDraftFocus | null;
  categories: StreamDraftCategory[];
  locations: { id: string; name: string }[];
  today: string;
  // Programmatic session hint (e.g. "onboarding") — the route keys a
  // prompt preamble off it. Prompt-only; never alters tool/apply semantics.
  intent?: string | null;
  signal?: AbortSignal;
  onText: (delta: string) => void;
  // Raw (possibly partial) propose_goals input plus its callIndex; the caller
  // normalizes and folds it against the turn-start working forest. `complete`
  // marks server-finalized emits (stamped propose_goals re-emit or fromOps
  // trees) — anything else may be a truncated partial if the stream aborts.
  onForest: (payload: {
    callIndex: number;
    proposal: unknown;
    complete: boolean;
  }) => void;
  // Template ops emit the full authoritative array — the caller replaces its
  // working templates wholesale (last write wins, no folding).
  onTemplates: (templates: DraftTemplate[]) => void;
  // Window/flag ops emit the full authoritative state — same contract.
  onWindows: (state: DraftWindowsState) => void;
  // show_goals: display-only request to bring goals into the tree pane.
  onShow: (payload: { goalIds: string[]; all: boolean }) => void;
  // Server-side tool activity (e.g. the model fetching goal trees) — for a
  // progress hint while a tool round trip runs.
  onStatus?: (payload: { tool: string; count: number }) => void;
  onDone: (stopReason: string | null) => void;
  onError: (message: string) => void;
}

export async function streamDraft({
  currentForest,
  currentTemplates,
  history,
  focus,
  categories,
  locations,
  today,
  intent,
  signal,
  onText,
  onForest,
  onTemplates,
  onWindows,
  onShow,
  onStatus,
  onDone,
  onError,
}: StreamDraftArgs): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/draft/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentForest,
        currentTemplates,
        history: history.slice(-MAX_HISTORY_MESSAGES),
        focus,
        categories,
        locations,
        today,
        intent: intent ?? null,
      }),
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
          onTemplates,
          onWindows,
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
  onText: StreamDraftArgs["onText"];
  onForest: StreamDraftArgs["onForest"];
  onTemplates: StreamDraftArgs["onTemplates"];
  onWindows: StreamDraftArgs["onWindows"];
  onShow: StreamDraftArgs["onShow"];
  onStatus: StreamDraftArgs["onStatus"];
  onDone: StreamDraftArgs["onDone"];
  onError: StreamDraftArgs["onError"];
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
      const { callIndex, complete, fromOps } = data as {
        callIndex?: unknown;
        complete?: unknown;
        fromOps?: unknown;
      };
      handlers.onForest({
        callIndex: typeof callIndex === "number" ? callIndex : 0,
        proposal: data,
        complete: complete === true || fromOps === true,
      });
      break;
    }
    case "templates": {
      const templates = normalizeDraftTemplates(data);
      if (templates) handlers.onTemplates(templates);
      break;
    }
    case "windows": {
      const state = normalizeDraftWindowsState(data);
      if (state) handlers.onWindows(state);
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
