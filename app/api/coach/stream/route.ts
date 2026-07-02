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

  let body: CoachRequestBody;
  try {
    body = (await req.json()) as CoachRequestBody;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { currentTree, history } = body;

  const anthropicMessages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      // Accumulate the tool_use input JSON as it streams; parse on each delta.
      let toolInputAccumulator = "";
      let lastEmittedTreeJson: string | null = null;

      try {
        const anthropicStream = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: buildSystemPrompt(currentTree),
          messages: anthropicMessages,
          tools: [proposeTreeTool],
        });

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
                const parsed = parsePartial(toolInputAccumulator, Allow.ALL);
                if (parsed && typeof parsed === "object" && "tree" in parsed) {
                  const treeJson = JSON.stringify(parsed.tree);
                  if (treeJson !== lastEmittedTreeJson) {
                    lastEmittedTreeJson = treeJson;
                    send("tree", { tree: parsed.tree });
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
        const message =
          err instanceof Anthropic.APIError
            ? `${err.status}: ${err.message}`
            : err instanceof Error
              ? err.message
              : "Unknown error";
        send("error", { message });
      } finally {
        controller.close();
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
