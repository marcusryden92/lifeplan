"use client";

import type { CoachNode } from "./plannerTreeToJson";

export interface StreamChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamCoachArgs {
  currentTree: CoachNode | null;
  history: StreamChatMessage[];
  signal?: AbortSignal;
  onText: (delta: string) => void;
  onTree: (tree: CoachNode) => void;
  onDone: (stopReason: string | null) => void;
  onError: (message: string) => void;
}

export async function streamCoach({
  currentTree,
  history,
  signal,
  onText,
  onTree,
  onDone,
  onError,
}: StreamCoachArgs): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/coach/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentTree, history }),
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
        dispatchSseEvent(rawEvent, { onText, onTree, onDone, onError });
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
  onTree: StreamCoachArgs["onTree"];
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
    case "tree":
      handlers.onTree((data as { tree: CoachNode }).tree);
      break;
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
