import Anthropic from "@anthropic-ai/sdk";
import { parse as parsePartial, Allow } from "partial-json";
import { auth } from "@/auth";
import type { CoachNode } from "@/components/coach/AICoachModal/plannerTreeToJson";

// Note: this file lives under app/api/ despite the CLAUDE.md convention of
// preferring server actions. Streaming binary/SSE responses don't map cleanly
// to the server-action return shape, so the coach's streaming endpoint is the
// exception. Non-streaming coach mutations should still use server actions.

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 16000;

// Request caps. The endpoint spends real money per call, so a malformed or
// hostile body should fail fast instead of being forwarded to Anthropic.
const MAX_HISTORY_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 8_000;
const MAX_TREE_CHARS = 200_000;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CoachChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface CoachRequestBody {
  currentTree: CoachNode | null;
  history: CoachChatMessage[];
}

function parseRequestBody(raw: unknown): CoachRequestBody | string {
  if (typeof raw !== "object" || raw === null) return "Body must be an object";
  const { currentTree, history } = raw as Record<string, unknown>;

  if (!Array.isArray(history) || history.length === 0) {
    return "history must be a non-empty array";
  }
  if (history.length > MAX_HISTORY_MESSAGES) {
    return `history exceeds ${MAX_HISTORY_MESSAGES} messages`;
  }
  for (const entry of history) {
    if (typeof entry !== "object" || entry === null) {
      return "history entries must be objects";
    }
    const { role, content } = entry as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") {
      return "history roles must be 'user' or 'assistant'";
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      return "history contents must be non-empty strings";
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      return `a history message exceeds ${MAX_MESSAGE_CHARS} characters`;
    }
  }

  if (currentTree !== null && currentTree !== undefined) {
    if (typeof currentTree !== "object" || Array.isArray(currentTree)) {
      return "currentTree must be an object or null";
    }
    if (JSON.stringify(currentTree).length > MAX_TREE_CHARS) {
      return `currentTree exceeds ${MAX_TREE_CHARS} serialized characters`;
    }
  }

  return {
    currentTree: (currentTree ?? null) as CoachNode | null,
    history: history as CoachChatMessage[],
  };
}

function buildSystemPrompt(tree: CoachNode | null): string {
  const treeJson = tree
    ? JSON.stringify(tree, null, 2)
    : "(no goal loaded)";
  return `You are a task-breakdown coach for Circadium, a personal scheduling app.

The user is working on a single goal and wants your help restructuring its subtasks. You reason about the goal's tree of subtasks and propose a new structure that better fits the user's request.

TREE STRUCTURE
Each node has:
- id: existing planner UUID. Echo it verbatim for retained nodes; OMIT the field (or set null) for new nodes.
- title: short human-readable name.
- plannerType: "task" | "plan" | "goal". Leaves are "task"; intermediate branches are "goal".
- duration: minutes required for that leaf task. For a "goal" node, duration is a rough estimate (children sum to the real total).
- deadline: ISO date string or null.
- priority: integer.
- isReady: boolean or null (goals only).
- children: ordered array of sub-nodes. Empty for leaves.

ID PRESERVATION (IMPORTANT)
The current tree includes each node's id. When you propose the new tree:
- KEEP an existing node: include its id EXACTLY as given.
- CREATE a new node: omit the id field or set it to null.
- REMOVE an existing node: simply don't include it in the proposed tree.
- Never invent, modify, or reuse an id from a different node.

TOOL USE
Emit the complete proposed tree via the \`propose_tree\` tool as a single call at the END of your response. Before calling the tool, briefly explain in prose what you're proposing and why. Keep the prose short — one or two sentences. The user will see the tree update visually as the tool call streams.

CURRENT TREE:
${treeJson}`;
}

const proposeTreeTool: Anthropic.Tool = {
  name: "propose_tree",
  description:
    "Propose a new structure for the goal's subtask tree. Emits the complete tree as a single nested object. Preserve existing planner UUIDs for retained nodes; omit id for new nodes.",
  input_schema: {
    type: "object",
    $defs: {
      coachNode: {
        type: "object",
        properties: {
          id: {
            type: ["string", "null"],
            description:
              "Existing planner UUID for retained nodes; omit or null for new nodes.",
          },
          title: { type: "string" },
          plannerType: {
            type: "string",
            enum: ["task", "plan", "goal"],
          },
          duration: {
            type: "integer",
            description: "Duration in minutes.",
          },
          deadline: { type: ["string", "null"] },
          priority: { type: "integer" },
          isReady: { type: ["boolean", "null"] },
          children: {
            type: "array",
            items: { $ref: "#/$defs/coachNode" },
          },
        },
        required: ["title", "plannerType", "duration", "children"],
      },
    },
    properties: {
      tree: { $ref: "#/$defs/coachNode" },
    },
    required: ["tree"],
  } as Anthropic.Tool["input_schema"],
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const parsed = parseRequestBody(rawBody);
  if (typeof parsed === "string") {
    return new Response(parsed, { status: 400 });
  }
  const { currentTree, history } = parsed;

  const anthropicMessages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        // The client can disconnect at any time; enqueue on a cancelled
        // controller throws, and there is nobody left to send to anyway.
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          closed = true;
        }
      };

      // Accumulate the tool_use input JSON as it streams; parse on each delta.
      let toolInputAccumulator = "";
      let lastEmittedTreeJson: string | null = null;

      try {
        // req.signal fires when the browser disconnects (tab closed, modal
        // dismissed). Forwarding it aborts the upstream Anthropic request so
        // we stop paying for tokens nobody will receive.
        const anthropicStream = client.messages.stream(
          {
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: buildSystemPrompt(currentTree),
            messages: anthropicMessages,
            tools: [proposeTreeTool],
          },
          { signal: req.signal },
        );

        for await (const event of anthropicStream) {
          if (event.type === "content_block_start") {
            if (event.content_block.type === "tool_use") {
              toolInputAccumulator = "";
            }
          } else if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              send("text", { delta: event.delta.text });
            } else if (event.delta.type === "input_json_delta") {
              toolInputAccumulator += event.delta.partial_json;
              // Best-effort partial parse. `Allow.ALL` lets partial-json fill
              // in missing brackets/quotes so we can extract whatever complete
              // subtree has landed so far.
              try {
                const parsed: unknown = parsePartial(
                  toolInputAccumulator,
                  Allow.ALL,
                );
                if (parsed && typeof parsed === "object" && "tree" in parsed) {
                  const tree = (parsed as { tree: unknown }).tree;
                  const treeJson = JSON.stringify(tree);
                  if (treeJson !== lastEmittedTreeJson) {
                    lastEmittedTreeJson = treeJson;
                    send("tree", { tree });
                  }
                }
              } catch {
                // Not yet parseable — wait for more deltas.
              }
            }
          }
        }

        const finalMessage = await anthropicStream.finalMessage();
        send("done", {
          stopReason: finalMessage.stop_reason,
        });
      } catch (err) {
        // Client-initiated abort is a normal exit, not an error to report.
        if (!req.signal.aborted) {
          const message =
            err instanceof Anthropic.APIError
              ? `${err.status}: ${err.message}`
              : err instanceof Error
                ? err.message
                : "Unknown error";
          send("error", { message });
        }
      } finally {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // Controller already cancelled by the disconnect.
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
