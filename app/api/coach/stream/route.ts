import Anthropic from "@anthropic-ai/sdk";
import { parse as parsePartial, Allow } from "partial-json";
import { auth } from "@/auth";
import type { CoachNode } from "@/components/coach/AICoachModal/plannerTreeToJson";
import type { CoachForest } from "@/components/coach/AICoachModal/plannerForestToJson";
import {
  addCoachItems,
  deleteCoachItems,
  moveCoachItem,
  searchCoachItems,
  updateCoachItems,
  type CoachItemUpdate,
  type CoachOpsResult,
} from "@/components/coach/AICoachModal/coachForestOps";
import { assignDraftIds } from "@/components/coach/AICoachModal/assignDraftIds";
import { normalizeCoachForest } from "@/components/coach/AICoachModal/normalizeCoachForest";
import { mergeCoachForest } from "@/components/coach/AICoachModal/mergeCoachForest";

// Note: this file lives under app/api/ despite the CLAUDE.md convention of
// preferring server actions. Streaming binary/SSE responses don't map cleanly
// to the server-action return shape, so the assistant's streaming endpoint is
// the exception. Non-streaming coach mutations should still use server actions.

// Architecture: the model does NOT receive the full forest. The system prompt
// carries a one-line-per-goal index; the model pulls complete trees on demand
// via the get_goal_trees tool, which the server answers from the forest the
// client uploaded (client -> our server is free; the index + fetched trees
// are all that ever reaches Anthropic). This runs as a tool-use loop:
// stream -> execute tool calls -> feed tool_results back -> stream again,
// until the model ends its turn.

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 16000;

// Request caps. The endpoint spends real money per call, so a malformed or
// hostile body should fail fast instead of being forwarded to Anthropic.
const MAX_HISTORY_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 8_000;
const MAX_FOREST_CHARS = 200_000;
const MAX_CATEGORIES = 200;
const MAX_CATEGORY_NAME_CHARS = 200;

// Loop guards.
const MAX_TOOL_TURNS = 8;
const MAX_TREES_PER_FETCH = 25;
const MAX_SEARCH_RESULTS = 25;
const MAX_OP_ITEMS = 50;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CoachChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface CoachCategory {
  id: string;
  name: string;
}

interface CoachFocus {
  rootId: string | null;
  itemId: string | null;
}

interface CoachRequestBody {
  currentForest: CoachForest;
  history: CoachChatMessage[];
  focus: CoachFocus | null;
  categories: CoachCategory[];
  today: string;
}

function parseRequestBody(raw: unknown): CoachRequestBody | string {
  if (typeof raw !== "object" || raw === null) return "Body must be an object";
  const { currentForest, history, focus, categories, today } = raw as Record<
    string,
    unknown
  >;

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

  if (
    typeof currentForest !== "object" ||
    currentForest === null ||
    !Array.isArray((currentForest as Record<string, unknown>).goals)
  ) {
    return "currentForest must be an object with a goals array";
  }
  if (JSON.stringify(currentForest).length > MAX_FOREST_CHARS) {
    return `currentForest exceeds ${MAX_FOREST_CHARS} serialized characters`;
  }

  if (!Array.isArray(categories)) {
    return "categories must be an array";
  }
  if (categories.length > MAX_CATEGORIES) {
    return `categories exceeds ${MAX_CATEGORIES} entries`;
  }
  const parsedCategories: CoachCategory[] = [];
  for (const entry of categories) {
    if (typeof entry !== "object" || entry === null) {
      return "category entries must be objects";
    }
    const { id, name } = entry as Record<string, unknown>;
    if (typeof id !== "string" || id.length === 0) {
      return "category ids must be non-empty strings";
    }
    if (typeof name !== "string" || name.length > MAX_CATEGORY_NAME_CHARS) {
      return "category names must be short strings";
    }
    parsedCategories.push({ id, name });
  }

  if (typeof today !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return "today must be a YYYY-MM-DD string";
  }

  let parsedFocus: CoachFocus | null = null;
  if (focus !== null && focus !== undefined) {
    if (typeof focus !== "object") return "focus must be an object or null";
    const { rootId, itemId } = focus as Record<string, unknown>;
    parsedFocus = {
      rootId: typeof rootId === "string" && rootId.length > 0 ? rootId : null,
      itemId: typeof itemId === "string" && itemId.length > 0 ? itemId : null,
    };
  }

  return {
    currentForest: currentForest as unknown as CoachForest,
    history: history as CoachChatMessage[],
    focus: parsedFocus,
    categories: parsedCategories,
    today,
  };
}

function countDescendants(node: CoachNode): number {
  return node.children.reduce(
    (sum, child) => sum + 1 + countDescendants(child),
    0,
  );
}

// One line per top-level goal — the model's cheap map of the forest. Full
// trees are only spent on Anthropic tokens when explicitly fetched.
function buildGoalIndex(
  forest: CoachForest,
  categories: CoachCategory[],
): string {
  if (forest.goals.length === 0) return "(no goals yet)";
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  return forest.goals
    .map((goal) => {
      const parts = [
        goal.id || "(new, unsaved)",
        goal.plannerType,
        `"${goal.title}"`,
      ];
      if (goal.categoryId) {
        parts.push(categoryNameById.get(goal.categoryId) ?? goal.categoryId);
      }
      if (goal.deadline) parts.push(`due ${goal.deadline}`);
      const n = countDescendants(goal);
      parts.push(n === 0 ? "no subtasks" : `${n} subtask${n === 1 ? "" : "s"}`);
      return `- ${parts.join(" | ")}`;
    })
    .join("\n");
}

function buildSystemPrompt({
  currentForest,
  focus,
  categories,
  today,
}: CoachRequestBody): string {
  const categoryList =
    categories.length > 0
      ? categories.map((c) => `- ${c.id}: ${c.name}`).join("\n")
      : "(the user has no categories yet)";

  const focusedGoal = focus?.rootId
    ? currentForest.goals.find((g) => g.id === focus.rootId)
    : undefined;
  const focusBlock = focusedGoal
    ? `
FOCUSED GOAL
The user currently has this goal open${
        focus?.itemId && focus.itemId !== focus.rootId
          ? ` (specifically the node with id ${focus.itemId})`
          : ""
      }. Its complete tree (already fetched for you — no need to call get_goal_trees for it):
${JSON.stringify(focusedGoal, null, 2)}

Scope your work to this goal unless the user asks for something broader.
`
    : "";

  return `You are a planning assistant for Circadium, a personal scheduling app.

The user's planning library is a forest of top-level goals (and loose tasks), each with a tree of subtasks. You help them restructure existing goals, create new goals with fully worked-out contents, and remove goals.

STYLE
The chat renders markdown — bold, lists, and inline code are fine; avoid headings and tables in casual replies. Keep responses short and conversational; the tree pane shows the details, so don't enumerate what the user can already see there.

Today's date is ${today}. Ground all deadlines relative to it.

GOAL INDEX (id | type | title | category | deadline | size)
${buildGoalIndex(currentForest, categories)}

This index is a summary. Use search_items to find specific items (including subtasks) by name, and get_goal_trees to read a goal's complete tree.

USER CATEGORIES (id: name)
${categoryList}
${focusBlock}
NODE STRUCTURE
Each node in a goal tree has:
- id: existing planner UUID. Echo it verbatim for retained nodes; OMIT the field (or set null) for new nodes.
- title: short human-readable name.
- plannerType: "task" | "plan" | "goal". Leaves are "task"; intermediate branches are "goal". Never create new "plan" nodes — plans need a fixed start time this contract doesn't carry.
- duration: minutes required for that leaf task. For a "goal" node, duration is a rough estimate (children sum to the real total).
- deadline: ISO date string or null.
- priority: integer.
- isReady: top-level goals only — true marks the goal ready for scheduling, and requires at least one subtask AND a deadline (the app blocks it otherwise). OMIT this field (or use null) on all child nodes; readiness cascades from the root (every row in a subtree carries the root's value, stamped on save), and readying is the user's decision.
- categoryId: top-level goals only — one of the user's category ids, or null. Echo it verbatim for retained goals (null on a retained goal means "leave as is"); pick a fitting category for new goals, or null if none fits. Never set it on child nodes; they inherit.
- children: ordered array of sub-nodes. Empty for leaves.

ID PRESERVATION (IMPORTANT)
- KEEP an existing node: include its id EXACTLY as given.
- CREATE a new node: omit the id field or set it to null. The app assigns it a draft id (reported in tool results and visible in fetched trees); unsaved drafts then behave exactly like saved goals — they appear in the index and work with every tool, including fetch-before-modify.
- Draft ids are replaced with permanent ids when the user saves, so never reuse an id remembered from an earlier conversation — verify against the current index or search first.
- REMOVE a node inside a goal you're editing: simply don't include it in that goal's tree.
- Never invent, modify, or reuse an id from a different node, and never move a node between two different top-level goals — that changes its identity.

TOOLS

Reading:
- search_items: find items (including subtasks) by title; returns ids and which goal they live in. Use it to locate anything whose id you don't have.
- get_goal_trees: fetch complete trees by id. Required before propose_goals may modify a goal (proposals are complete-tree replacements; editing blind would silently delete subtasks). The focused goal (if any) is already provided. Tool results are NOT retained between user messages — re-fetch each message.

Editing — deterministic operations. PREFER these for small changes; each applies immediately to the user's review pane as a pending change (nothing is saved without their confirmation):
- update_items: change fields (title, duration, deadline, priority, isReady; categoryId on top-level goals only) on items by id. No fetch needed.
- move_item: move or reorder an item within its own goal (new parent + position). Cross-goal moves and moving top-level goals are not supported.
- add_items: insert new subtasks under an existing parent. Added items are assigned draft ids on insertion — fetch the goal tree if you need to reference them.
- delete_items: remove items (with their subtrees) or whole goals by id.

Building:
- propose_goals: create new top-level goals, or restructure a goal wholesale. Complete trees ONLY for goals you create or modify — never re-emit untouched goals, and never use this for small edits (use the editing tools instead). Emit each goal's id as its FIRST field; new nodes omit id (draft ids are assigned and reported back). deletedGoalIds removes whole goals. The order of the goals array is not meaningful.

Display:
- show_goals: bring existing goals into the user's tree pane without changing them. Pass ids, or all: true.

The user's tree pane starts nearly empty: it displays only the focused goal, goals you change, and goals you show.

Always write at least one short sentence of prose before calling any tool — never reply with a bare tool call. If the user is only asking a question, answer in prose (using the reading tools if needed) and don't make changes.`;
}

const getGoalTreesTool: Anthropic.Tool = {
  name: "get_goal_trees",
  description:
    "Fetch the complete trees of top-level goals by id (from the goal index). Required before modifying a goal. Results are not retained between user messages.",
  input_schema: {
    type: "object",
    properties: {
      goalIds: {
        type: "array",
        items: { type: "string" },
        description: `Ids of top-level goals to fetch (max ${MAX_TREES_PER_FETCH} per call).`,
      },
    },
    required: ["goalIds"],
  } as Anthropic.Tool["input_schema"],
};

const proposeGoalsTool: Anthropic.Tool = {
  name: "propose_goals",
  description:
    "Propose changes to the user's goal forest. Emits complete trees only for the top-level goals being created or modified, plus the ids of goals to delete. Untouched goals must not be re-emitted. Preserve existing planner UUIDs for retained nodes; omit id for new nodes. You must have fetched (or been given) the current tree of any goal you modify.",
  input_schema: {
    type: "object",
    $defs: {
      coachNode: {
        type: "object",
        properties: {
          id: {
            type: ["string", "null"],
            description:
              "Existing planner UUID for retained nodes; omit or null for new nodes. Emit this as the first field.",
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
          categoryId: {
            type: ["string", "null"],
            description:
              "Top-level goals only: one of the user's category ids, or null. Never set on child nodes.",
          },
          children: {
            type: "array",
            items: { $ref: "#/$defs/coachNode" },
          },
        },
        required: ["title", "plannerType", "duration", "children"],
      },
    },
    properties: {
      goals: {
        type: "array",
        description:
          "Complete trees for created or modified top-level goals only.",
        items: { $ref: "#/$defs/coachNode" },
      },
      deletedGoalIds: {
        type: "array",
        description: "Ids of top-level goals to remove entirely.",
        items: { type: "string" },
      },
    },
    required: ["goals"],
  } as Anthropic.Tool["input_schema"],
};

const showGoalsTool: Anthropic.Tool = {
  name: "show_goals",
  description:
    "Bring existing top-level goals into the user's tree pane without proposing any changes. Use when the user asks to see goals. Pass all: true to display the whole forest.",
  input_schema: {
    type: "object",
    properties: {
      goalIds: {
        type: "array",
        items: { type: "string" },
        description: "Ids of top-level goals to display.",
      },
      all: {
        type: "boolean",
        description: "Display every goal.",
      },
    },
  } as Anthropic.Tool["input_schema"],
};

const searchItemsTool: Anthropic.Tool = {
  name: "search_items",
  description:
    "Search all items (goals and subtasks at any depth) by title. Returns matching ids, types, and which top-level goal each item lives in. Use this to locate items whose ids you don't have.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Case-insensitive title search.",
      },
    },
    required: ["query"],
  } as Anthropic.Tool["input_schema"],
};

const updateItemsTool: Anthropic.Tool = {
  name: "update_items",
  description:
    "Change fields on existing items by id — title, duration (minutes), deadline (ISO date or null to clear), priority, isReady, and categoryId (top-level goals only; null to clear). Structural changes (adding, moving, removing items) use the other tools.",
  input_schema: {
    type: "object",
    properties: {
      updates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            duration: { type: "integer" },
            deadline: { type: ["string", "null"] },
            priority: { type: "integer" },
            isReady: { type: ["boolean", "null"] },
            categoryId: { type: ["string", "null"] },
          },
          required: ["id"],
        },
      },
    },
    required: ["updates"],
  } as Anthropic.Tool["input_schema"],
};

const moveItemTool: Anthropic.Tool = {
  name: "move_item",
  description:
    "Move or reorder an item within its own top-level goal. The new parent may be the goal itself or any node inside it. Position: afterSiblingId inserts after that child of the new parent; atStart inserts first; neither appends at the end. Top-level goals and cross-goal moves are not supported.",
  input_schema: {
    type: "object",
    properties: {
      itemId: { type: "string" },
      newParentId: { type: "string" },
      afterSiblingId: { type: "string" },
      atStart: { type: "boolean" },
    },
    required: ["itemId", "newParentId"],
  } as Anthropic.Tool["input_schema"],
};

const addItemsTool: Anthropic.Tool = {
  name: "add_items",
  description:
    "Insert new items (with optional nested children) under an existing parent — the goal itself or any node inside it. Items use the node structure WITHOUT ids (real ids are assigned when the user saves). Position works like move_item.",
  input_schema: {
    type: "object",
    properties: {
      parentId: { type: "string" },
      items: {
        type: "array",
        items: { $ref: "#/$defs/newNode" },
      },
      afterSiblingId: { type: "string" },
      atStart: { type: "boolean" },
    },
    $defs: {
      newNode: {
        type: "object",
        properties: {
          title: { type: "string" },
          plannerType: { type: "string", enum: ["task", "goal"] },
          duration: { type: "integer" },
          deadline: { type: ["string", "null"] },
          priority: { type: "integer" },
          isReady: { type: ["boolean", "null"] },
          children: {
            type: "array",
            items: { $ref: "#/$defs/newNode" },
          },
        },
        required: ["title", "plannerType", "duration", "children"],
      },
    },
    required: ["parentId", "items"],
  } as Anthropic.Tool["input_schema"],
};

const deleteItemsTool: Anthropic.Tool = {
  name: "delete_items",
  description:
    "Delete items by id, including their whole subtrees. A top-level goal id deletes the entire goal.",
  input_schema: {
    type: "object",
    properties: {
      itemIds: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["itemIds"],
  } as Anthropic.Tool["input_schema"],
};

function parseGoalIds(input: unknown): string[] {
  const goalIds = (input as { goalIds?: unknown } | null)?.goalIds;
  if (!Array.isArray(goalIds)) return [];
  return goalIds.filter((id): id is string => typeof id === "string");
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

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

  // The server's working copy: deterministic edit tools mutate this (via the
  // pure coachForestOps functions), so later reads within the same request
  // see earlier edits. The client mirrors each edit through forest events.
  let workingForest: CoachForest = parsed.currentForest;
  const getGoal = (id: string): CoachNode | undefined =>
    workingForest.goals.find((g) => g.id === id);

  const existingGoalIds = new Set(
    parsed.currentForest.goals.map((g) => g.id).filter((id) => id.length > 0),
  );
  const validCategoryIds = new Set(parsed.categories.map((c) => c.id));

  // Trees the model may legitimately modify this request: the focused goal is
  // pre-fetched in the prompt; everything else must go through get_goal_trees
  // first. Guards against complete-tree proposals silently dropping subtasks
  // the model never saw.
  const fetchedGoalIds = new Set<string>();
  if (parsed.focus?.rootId) fetchedGoalIds.add(parsed.focus.rootId);

  const systemPrompt = buildSystemPrompt(parsed);

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

      // Streamed proposals are keyed by call index so the client can fold
      // multiple propose_goals calls from one turn without them clobbering
      // each other's merges.
      let proposeCallCounter = 0;

      const isProposalGoalAllowed = (goal: unknown): boolean => {
        const id = (goal as { id?: unknown } | null)?.id;
        if (typeof id !== "string" || id.length === 0) return true; // new goal
        if (!existingGoalIds.has(id)) return true; // unknown id -> new goal
        return fetchedGoalIds.has(id);
      };

      const filterProposal = (partial: unknown) => {
        const { goals, deletedGoalIds } = (partial ?? {}) as {
          goals?: unknown;
          deletedGoalIds?: unknown;
        };
        const allGoals = Array.isArray(goals) ? goals : [];
        return {
          goals: allGoals.filter(isProposalGoalAllowed),
          rejectedIds: allGoals
            .map((g) => (g as { id?: unknown } | null)?.id)
            .filter(
              (id): id is string =>
                typeof id === "string" &&
                existingGoalIds.has(id) &&
                !fetchedGoalIds.has(id),
            ),
          deletedGoalIds: deletedGoalIds ?? [],
        };
      };

      const executeGetGoalTrees = (input: unknown): string => {
        const ids = parseGoalIds(input).slice(0, MAX_TREES_PER_FETCH);
        const trees: CoachNode[] = [];
        const missingIds: string[] = [];
        for (const id of ids) {
          const goal = getGoal(id);
          if (goal) {
            trees.push(goal);
            fetchedGoalIds.add(id);
          } else {
            missingIds.push(id);
          }
        }
        return JSON.stringify({ trees, missingIds });
      };

      // Adopt an edit-tool result: advance the working copy, mirror changed
      // goals to the client through the same forest-event path proposals use
      // (fromOps marks the trees as code-computed — the client merge then
      // trusts null categoryId as an intentional clear rather than
      // backfilling it), and summarize for the model's tool_result.
      const applyOpResult = (
        result: CoachOpsResult,
        appliedVerb: string,
      ): string => {
        workingForest = result.forest;
        const changed =
          result.updatedRootIds.length > 0 || result.deletedGoalIds.length > 0;
        if (changed) {
          send("forest", {
            callIndex: proposeCallCounter++,
            goals: result.updatedRootIds
              .map((id) => getGoal(id))
              .filter(Boolean),
            deletedGoalIds: result.deletedGoalIds,
            fromOps: true,
          });
        }
        const parts: string[] = [];
        if (changed) {
          parts.push(
            `${appliedVerb} — the user sees it as a pending change.`,
          );
        }
        if (result.failures.length > 0) {
          parts.push(
            `Failed: ${result.failures
              .map((f) => `${f.id ?? "(no id)"}: ${f.reason}`)
              .join("; ")}.`,
          );
        }
        return parts.join(" ") || "Nothing changed.";
      };

      try {
        const messages: Anthropic.MessageParam[] = parsed.history.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        let stopReason: string | null = null;

        // Prose segments before and after a tool call are separate content
        // blocks; the client concatenates all text into one bubble, so
        // without an injected break they fuse mid-sentence
        // ("...your goals!Your planning library...").
        let anyTextSent = false;
        let needsSeparator = false;

        for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
          // req.signal fires when the browser disconnects (tab closed, modal
          // dismissed). Forwarding it aborts the upstream Anthropic request
          // so we stop paying for tokens nobody will receive.
          const anthropicStream = client.messages.stream(
            {
              model: MODEL,
              max_tokens: MAX_TOKENS,
              system: systemPrompt,
              messages,
              tools: [
                searchItemsTool,
                getGoalTreesTool,
                updateItemsTool,
                moveItemTool,
                addItemsTool,
                deleteItemsTool,
                proposeGoalsTool,
                showGoalsTool,
              ],
            },
            { signal: req.signal },
          );

          let toolInputAccumulator = "";
          let currentToolName: string | null = null;
          let currentProposeCallIndex = 0;
          let lastEmittedProposalJson: string | null = null;
          // The final stamped re-emit (in the tool-execution pass below) must
          // reuse the callIndex the partial deltas streamed under, so the
          // client fold replaces them instead of stacking a second proposal.
          const proposeCallIndexByToolUseId = new Map<string, number>();

          for await (const event of anthropicStream) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                toolInputAccumulator = "";
                currentToolName = event.content_block.name;
                if (currentToolName === "propose_goals") {
                  currentProposeCallIndex = proposeCallCounter++;
                  proposeCallIndexByToolUseId.set(
                    event.content_block.id,
                    currentProposeCallIndex,
                  );
                }
                if (anyTextSent) needsSeparator = true;
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                if (needsSeparator) {
                  needsSeparator = false;
                  send("text", { delta: "\n\n" });
                }
                anyTextSent = true;
                send("text", { delta: event.delta.text });
              } else if (event.delta.type === "input_json_delta") {
                toolInputAccumulator += event.delta.partial_json;
                if (currentToolName !== "propose_goals") continue;
                // Best-effort partial parse. `Allow.ALL` lets partial-json
                // fill in missing brackets/quotes so we can extract whatever
                // complete goals have landed so far.
                try {
                  const partial: unknown = parsePartial(
                    toolInputAccumulator,
                    Allow.ALL,
                  );
                  if (
                    partial &&
                    typeof partial === "object" &&
                    "goals" in partial
                  ) {
                    const filtered = filterProposal(partial);
                    const proposal = {
                      callIndex: currentProposeCallIndex,
                      goals: filtered.goals,
                      deletedGoalIds: filtered.deletedGoalIds,
                    };
                    const proposalJson = JSON.stringify(proposal);
                    if (proposalJson !== lastEmittedProposalJson) {
                      lastEmittedProposalJson = proposalJson;
                      send("forest", proposal);
                    }
                  }
                } catch {
                  // Not yet parseable — wait for more deltas.
                }
              }
            } else if (event.type === "content_block_stop") {
              if (currentToolName === "show_goals") {
                try {
                  const input: unknown = JSON.parse(
                    toolInputAccumulator || "{}",
                  );
                  const { all } = (input ?? {}) as { all?: unknown };
                  send("show", {
                    goalIds: parseGoalIds(input),
                    all: all === true,
                  });
                } catch {
                  // Malformed tool input — nothing to show.
                }
              }
              currentToolName = null;
            }
          }

          const finalMessage = await anthropicStream.finalMessage();
          stopReason = finalMessage.stop_reason;
          if (finalMessage.stop_reason !== "tool_use") break;

          const toolUses = finalMessage.content.filter(
            (block): block is Anthropic.ToolUseBlock =>
              block.type === "tool_use",
          );
          if (toolUses.length === 0) break;

          const results: Anthropic.ToolResultBlockParam[] = toolUses.map(
            (tu) => {
              const input = tu.input as Record<string, unknown>;
              let content: string;
              switch (tu.name) {
                case "get_goal_trees": {
                  send("status", {
                    tool: tu.name,
                    count: parseGoalIds(tu.input).length,
                  });
                  content = executeGetGoalTrees(tu.input);
                  break;
                }
                case "search_items": {
                  send("status", { tool: tu.name, count: 1 });
                  const query =
                    typeof input?.query === "string" ? input.query : "";
                  content = JSON.stringify({
                    hits: searchCoachItems(
                      workingForest,
                      query,
                      MAX_SEARCH_RESULTS,
                    ),
                  });
                  break;
                }
                case "update_items": {
                  const updates = (
                    Array.isArray(input?.updates) ? input.updates : []
                  ).slice(0, MAX_OP_ITEMS) as CoachItemUpdate[];
                  send("status", { tool: tu.name, count: updates.length });
                  content = applyOpResult(
                    updateCoachItems(workingForest, updates, validCategoryIds),
                    `Updated ${updates.length} item(s)`,
                  );
                  break;
                }
                case "move_item": {
                  send("status", { tool: tu.name, count: 1 });
                  content = applyOpResult(
                    moveCoachItem(workingForest, {
                      itemId:
                        typeof input?.itemId === "string" ? input.itemId : "",
                      newParentId:
                        typeof input?.newParentId === "string"
                          ? input.newParentId
                          : "",
                      afterSiblingId:
                        typeof input?.afterSiblingId === "string"
                          ? input.afterSiblingId
                          : undefined,
                      atStart: input?.atStart === true,
                    }),
                    "Moved the item",
                  );
                  break;
                }
                case "add_items": {
                  const items = (
                    Array.isArray(input?.items) ? input.items : []
                  ).slice(0, MAX_OP_ITEMS);
                  send("status", { tool: tu.name, count: items.length });
                  content = applyOpResult(
                    addCoachItems(workingForest, {
                      parentId:
                        typeof input?.parentId === "string"
                          ? input.parentId
                          : "",
                      items,
                      afterSiblingId:
                        typeof input?.afterSiblingId === "string"
                          ? input.afterSiblingId
                          : undefined,
                      atStart: input?.atStart === true,
                    }),
                    `Added ${items.length} item(s) with draft ids (fetch the goal tree to read them)`,
                  );
                  break;
                }
                case "delete_items": {
                  const itemIds = parseStringArray(input?.itemIds).slice(
                    0,
                    MAX_OP_ITEMS,
                  );
                  send("status", { tool: tu.name, count: itemIds.length });
                  content = applyOpResult(
                    deleteCoachItems(workingForest, itemIds),
                    `Deleted ${itemIds.length} item(s)`,
                  );
                  break;
                }
                case "propose_goals": {
                  const filtered = filterProposal(tu.input);
                  // Stamp draft ids on the accepted goals, adopt them into
                  // the server's working copy (so same-turn fetches and edit
                  // ops see them), and re-emit the stamped proposal under the
                  // callIndex its id-less partials streamed with — the client
                  // fold replaces those partials with the final stamped trees.
                  const normalized = normalizeCoachForest({
                    goals: filtered.goals,
                    deletedGoalIds: filtered.deletedGoalIds,
                  });
                  let assignedNote = "";
                  if (normalized) {
                    const { goals: stampedGoals, newRoots } = assignDraftIds(
                      normalized.goals,
                    );
                    workingForest = mergeCoachForest(workingForest, {
                      ...normalized,
                      goals: stampedGoals,
                    });
                    for (const root of newRoots) {
                      // The model authored these trees this request — no
                      // fetch required before revising them.
                      existingGoalIds.add(root.id);
                      fetchedGoalIds.add(root.id);
                    }
                    send("forest", {
                      callIndex:
                        proposeCallIndexByToolUseId.get(tu.id) ??
                        proposeCallCounter++,
                      goals: stampedGoals,
                      deletedGoalIds: normalized.deletedGoalIds,
                    });
                    if (newRoots.length > 0) {
                      assignedNote = ` New goals were assigned draft ids: ${newRoots
                        .map((r) => `"${r.title}" = ${r.id}`)
                        .join(
                          ", ",
                        )}. Draft ids work with every tool; permanent ids replace them when the user saves.`;
                    }
                  }
                  content =
                    filtered.rejectedIds.length > 0
                      ? `Proposal received, EXCEPT these goals were REJECTED because you have not fetched their trees this message: ${filtered.rejectedIds.join(", ")}. Call get_goal_trees for them, then re-propose only those goals.`
                      : `Proposal received. The user sees it as a pending diff; do not repeat it.${assignedNote}`;
                  break;
                }
                default:
                  content = "Goals displayed.";
              }
              return {
                type: "tool_result",
                tool_use_id: tu.id,
                content,
              };
            },
          );

          messages.push({ role: "assistant", content: finalMessage.content });
          messages.push({ role: "user", content: results });
        }

        send("done", { stopReason });
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
