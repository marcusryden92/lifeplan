import Anthropic from "@anthropic-ai/sdk";
import { parse as parsePartial, Allow } from "partial-json";
import { auth } from "@/auth";
import type { DraftNode } from "@/components/draft/AIDraftModal/plannerTreeToJson";
import type { DraftForest } from "@/components/draft/AIDraftModal/plannerForestToJson";
import {
  addDraftItems,
  deleteDraftItems,
  moveDraftItem,
  searchDraftItems,
  updateDraftItems,
  type DraftItemUpdate,
  type DraftOpsResult,
} from "@/components/draft/AIDraftModal/draftForestOps";
import { assignDraftIds } from "@/components/draft/AIDraftModal/assignDraftIds";
import { normalizeDraftForest } from "@/components/draft/AIDraftModal/normalizeDraftForest";
import { mergeDraftForest } from "@/components/draft/AIDraftModal/mergeDraftForest";
import {
  isValidStartDay,
  isValidTime,
  normalizeDraftTemplate,
  type DraftTemplate,
} from "@/components/draft/AIDraftModal/draftTemplates";
import {
  addDraftTemplates,
  deleteDraftTemplates,
  updateDraftTemplates,
  type DraftTemplateOpsResult,
  type DraftTemplateUpdate,
} from "@/components/draft/AIDraftModal/draftTemplateOps";
import {
  findWindowOverlaps,
  type DraftWindowsState,
  type DraftTimeWindow,
} from "@/components/draft/AIDraftModal/draftWindows";
import {
  addDraftTimeWindows,
  deleteDraftTimeWindows,
  updateDraftCategorySettings,
  updateDraftTimeWindows,
  type DraftCategorySettingsUpdate,
  type DraftTimeWindowUpdate,
  type DraftWindowOpsResult,
} from "@/components/draft/AIDraftModal/draftWindowOps";

// Note: this file lives under app/api/ despite the CLAUDE.md convention of
// preferring server actions. Streaming binary/SSE responses don't map cleanly
// to the server-action return shape, so the assistant's streaming endpoint is
// the exception. Non-streaming draft mutations should still use server actions.

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
const MAX_TEMPLATES = 200;
const MAX_LOCATIONS = 100;
const MAX_TIME_WINDOWS_PER_CATEGORY = 56;

// Loop guards. Twelve turns fits the headline flow (search + fetch + template
// batches + window edits + propose_goals + follow-ups) without inviting
// runaways.
const MAX_TOOL_TURNS = 12;
const MAX_TREES_PER_FETCH = 25;
const MAX_SEARCH_RESULTS = 25;
const MAX_OP_ITEMS = 50;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface DraftChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestTimeWindow {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
}

interface DraftCategory {
  id: string;
  name: string;
  isStrict: boolean;
  useTimeWindows: boolean;
  timeSlots: RequestTimeWindow[];
}

interface DraftLocationRef {
  id: string;
  name: string;
}

interface DraftFocus {
  rootId: string | null;
  itemId: string | null;
}

interface DraftRequestBody {
  currentForest: DraftForest;
  currentTemplates: DraftTemplate[];
  history: DraftChatMessage[];
  focus: DraftFocus | null;
  categories: DraftCategory[];
  locations: DraftLocationRef[];
  today: string;
  // Programmatic session hint (e.g. "onboarding"). Prompt preamble only —
  // never gates tool availability or apply semantics.
  intent: string | null;
}

function parseRequestBody(raw: unknown): DraftRequestBody | string {
  if (typeof raw !== "object" || raw === null) return "Body must be an object";
  const {
    currentForest,
    currentTemplates,
    history,
    focus,
    categories,
    locations,
    today,
    intent,
  } = raw as Record<string, unknown>;

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
  const parsedCategories: DraftCategory[] = [];
  for (const entry of categories) {
    if (typeof entry !== "object" || entry === null) {
      return "category entries must be objects";
    }
    const { id, name, isStrict, useTimeWindows, timeSlots } = entry as Record<
      string,
      unknown
    >;
    if (typeof id !== "string" || id.length === 0) {
      return "category ids must be non-empty strings";
    }
    if (typeof name !== "string" || name.length > MAX_CATEGORY_NAME_CHARS) {
      return "category names must be short strings";
    }
    const parsedSlots: RequestTimeWindow[] = [];
    if (timeSlots !== undefined) {
      if (!Array.isArray(timeSlots)) {
        return "category timeSlots must be an array";
      }
      if (timeSlots.length > MAX_TIME_WINDOWS_PER_CATEGORY) {
        return `a category exceeds ${MAX_TIME_WINDOWS_PER_CATEGORY} time windows`;
      }
      for (const slot of timeSlots) {
        if (typeof slot !== "object" || slot === null) {
          return "time window entries must be objects";
        }
        const { id: windowId, day, startTime, endTime } = slot as Record<
          string,
          unknown
        >;
        if (typeof windowId !== "string" || windowId.length === 0) {
          return "time window ids must be non-empty strings";
        }
        if (!isValidStartDay(day) || !isValidTime(startTime) || !isValidTime(endTime)) {
          return "time windows must have day 0-6 and HH:MM start/end times";
        }
        parsedSlots.push({ id: windowId, day, startTime, endTime });
      }
    }
    parsedCategories.push({
      id,
      name,
      isStrict: isStrict === true,
      useTimeWindows: useTimeWindows === true,
      timeSlots: parsedSlots,
    });
  }

  if (!Array.isArray(locations)) {
    return "locations must be an array";
  }
  if (locations.length > MAX_LOCATIONS) {
    return `locations exceeds ${MAX_LOCATIONS} entries`;
  }
  const parsedLocations: DraftLocationRef[] = [];
  for (const entry of locations) {
    if (typeof entry !== "object" || entry === null) {
      return "location entries must be objects";
    }
    const { id, name } = entry as Record<string, unknown>;
    if (typeof id !== "string" || id.length === 0) {
      return "location ids must be non-empty strings";
    }
    if (typeof name !== "string" || name.length > MAX_CATEGORY_NAME_CHARS) {
      return "location names must be short strings";
    }
    parsedLocations.push({ id, name });
  }

  if (!Array.isArray(currentTemplates)) {
    return "currentTemplates must be an array";
  }
  if (currentTemplates.length > MAX_TEMPLATES) {
    return `currentTemplates exceeds ${MAX_TEMPLATES} entries`;
  }
  const parsedTemplates: DraftTemplate[] = [];
  for (const entry of currentTemplates) {
    const template = normalizeDraftTemplate(entry);
    if (!template) return "currentTemplates contains a malformed template";
    parsedTemplates.push(template);
  }

  if (typeof today !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return "today must be a YYYY-MM-DD string";
  }

  let parsedFocus: DraftFocus | null = null;
  if (focus !== null && focus !== undefined) {
    if (typeof focus !== "object") return "focus must be an object or null";
    const { rootId, itemId } = focus as Record<string, unknown>;
    parsedFocus = {
      rootId: typeof rootId === "string" && rootId.length > 0 ? rootId : null,
      itemId: typeof itemId === "string" && itemId.length > 0 ? itemId : null,
    };
  }

  return {
    currentForest: currentForest as unknown as DraftForest,
    currentTemplates: parsedTemplates,
    history: history as DraftChatMessage[],
    focus: parsedFocus,
    categories: parsedCategories,
    locations: parsedLocations,
    today,
    intent: typeof intent === "string" && intent.length > 0 ? intent : null,
  };
}

function countDescendants(node: DraftNode): number {
  return node.children.reduce(
    (sum, child) => sum + 1 + countDescendants(child),
    0,
  );
}

// One line per top-level goal — the model's cheap map of the forest. Full
// trees are only spent on Anthropic tokens when explicitly fetched.
function buildGoalIndex(
  forest: DraftForest,
  categories: DraftCategory[],
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

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatCategoryLine(category: DraftCategory): string {
  const flags = `strict: ${category.isStrict ? "yes" : "no"} | windows: ${
    category.useTimeWindows ? "on" : "off"
  }`;
  let line = `- ${category.id}: ${category.name} | ${flags}`;
  for (const w of category.timeSlots) {
    line += `\n  - ${w.id} | ${DAY_NAMES[w.day]} ${w.startTime}-${w.endTime}`;
  }
  return line;
}

function buildTemplateList(
  templates: DraftTemplate[],
  locations: DraftLocationRef[],
): string {
  if (templates.length === 0) return "(no weekly templates yet)";
  const locationNameById = new Map(locations.map((l) => [l.id, l.name]));
  return templates
    .map((t) => {
      const location = t.locationId
        ? locationNameById.get(t.locationId) ?? t.locationId
        : "Anywhere";
      const parts = [
        t.id,
        `${DAY_NAMES[t.startDay]} ${t.startTime} +${t.duration}min`,
        `"${t.title}"`,
        location,
      ];
      if (t.color) parts.push(t.color);
      return `- ${parts.join(" | ")}`;
    })
    .join("\n");
}

function buildSystemPrompt({
  currentForest,
  currentTemplates,
  focus,
  categories,
  locations,
  today,
  intent,
}: DraftRequestBody): string {
  const categoryList =
    categories.length > 0
      ? categories.map(formatCategoryLine).join("\n")
      : "(the user has no categories yet)";

  const locationList =
    locations.length > 0
      ? locations.map((l) => `- ${l.id}: ${l.name}`).join("\n")
      : "(the user has no locations yet)";

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

  const intentBlock =
    intent === "onboarding"
      ? `
ONBOARDING SESSION
The user just finished first-run setup and this is their first contact with the assistant. They may already have jotted a few raw items in a brain-dump step — those arrive as triaged top-level tasks, plans, and goals in the GOAL INDEX, most of them missing the details the scheduler needs. Your job is to turn what's there into a plan that can actually be scheduled, and to fill any gaps by interviewing.

Work through the items warmly, one or two questions at a time — never a form or a wall of questions. For each:
- A bare TASK needs a realistic duration and, if it's time-sensitive, a deadline. Set both with update_items once you know them.
- A bare GOAL needs subtasks (add_items or propose_goals), a deadline if there is one, and a conversation about whether it's ready to start. Only set isReady (via update_items) once its subtasks and requirements are actually in place — readiness is a deliberate step, not a default.
- A PLAN is a fixed-time commitment, but you CANNOT set its start time from here (there is no starts field in your tools). Ask when it happens: if it recurs weekly, offer to add a weekly template instead; if it's really a deadline-driven task, offer to convert it to a task (update_items with plannerType "task" — the start time is preserved on save); otherwise tell the user they can set the exact time on the item's page later.
- Assign each item to one of the user's roles (their top-level categories — categoryId on the top-level row) where it fits.

Don't end the session leaving triaged items without what they need to schedule — a task with no duration, a goal with no subtasks. If little or nothing was dumped, interview the user about the current season of their life and draft 2-4 goals across their roles. Only propose category time windows if a natural rhythm surfaces (a fixed study block, gym mornings). Keep every message short and encouraging; nothing is committed until they press Save, so invite them to react and adjust.
`
      : "";

  return `You are a planning assistant for Circadium, a personal scheduling app.

The user's planning library is a forest of top-level goals (and loose tasks), each with a tree of subtasks. You help them restructure existing goals, create new goals with fully worked-out contents, and remove goals. You also manage their weekly template blocks — the fixed recurring commitments (sleep, work hours, standing sessions) the scheduler plans around — and their category time windows, the weekly hours a category's items are allowed to schedule in.

STYLE
The chat renders markdown — bold, lists, and inline code are fine; avoid headings and tables in casual replies. Keep responses short and conversational; the tree pane shows the details, so don't enumerate what the user can already see there.

Today's date is ${today}. Ground all deadlines relative to it.

GOAL INDEX (id | type | title | category | deadline | size)
${buildGoalIndex(currentForest, categories)}

This index is a summary. Use search_items to find specific items (including subtasks) by name, and get_goal_trees to read a goal's complete tree.

USER CATEGORIES (id: name | flags; indented lines are the category's time windows: windowId | day range)
${categoryList}

USER LOCATIONS (id: name) — read-only; you cannot create locations, only reference these ids
${locationList}

WEEKLY TEMPLATES (id | day start +duration | title | location | color)
${buildTemplateList(currentTemplates, locations)}

Templates are fixed weekly-recurring blocks of occupied time; goals and tasks are schedulable work the engine places into the remaining gaps. Template rules:
- One template = one block on one weekday, recurring every week. "Gym three times a week" = three templates on distinct days.
- startDay is 0-6 with 0 = Sunday. startTime is "HH:MM" 24h; duration is minutes. A block spanning midnight keeps its start day and runs past it: sleep 23:00-07:00 is startTime "23:00", duration 480.
- Overlapping templates are allowed but usually a mistake — flag overlaps in prose.
- color: optional 6-digit hex. Reuse one color for every block of the same activity. Good palette picks: #1976D2 blue, #2E7D32 green, #F77F00 orange, #6C5CE7 violet, #16A085 teal, #E63946 red, #FFB703 amber, #1D3557 navy.
- locationId: one of the user's location ids, or omit for "Anywhere".
- The full current template list is always shown above — there is nothing to fetch. Template ids are minted by the app and reported back when you add.

Category time windows bound WHEN a category's goals and tasks may be scheduled (work items only during work hours, etc.). Window rules:
- One window = one day + one within-day range: "HH:MM" 24h with startTime < endTime. Use "23:59" for end of day; spanning midnight takes two windows (evening + next morning).
- Windows must NEVER overlap — not within a category and not across categories (two categories cannot both claim the same hours). Plan the week as non-overlapping blocks. The tool result flags any overlap your change creates; fix it immediately with update_time_windows or delete_time_windows before ending your turn.
- Windows only take effect while the category's windows flag is on. Adding a window to a category with windows off turns the flag on automatically — mention that to the user.
- strict: a strict category reserves its windows exclusively for its own items; other work is pushed out. This reshapes the whole schedule — only change strict when the user explicitly asks.
- The full window list is always shown above under USER CATEGORIES — there is nothing to fetch. Window ids are minted by the app and reported back when you add.
- Windows constrain scheduling; templates occupy time. "I work 9-17" as occupied time is a template; "work tasks should happen 9-17" is a window on the Work category.
- WORD CHOICE decides the tool, not the topic. If the user says "window" or "category window" (even "Work category windows"), use the window tools (add_time_windows / update_time_windows) and NEVER add_templates. If they say "template", "block", or "commitment", use the template tools. When genuinely ambiguous, ask which they mean rather than guessing.
${focusBlock}${intentBlock}
NODE STRUCTURE
Each node in a goal tree has:
- id: existing planner UUID. Echo it verbatim for retained nodes; OMIT the field (or set null) for new nodes.
- title: short human-readable name.
- plannerType: "task" | "plan" | "goal". Leaves are "task"; any node with subtasks is a "goal" — the app enforces this automatically, so you never need to fix a parent's type by hand. Change a leaf's type with update_items (task <-> goal, or plan -> task). Never create new "plan" nodes — plans need a fixed start time this contract doesn't carry.
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
- update_items: change fields (title, plannerType task/goal, duration, deadline, priority, isReady; categoryId on top-level goals only) on items by id. No fetch needed. Use this to convert an item's type — you no longer need propose_goals just to change a task into a goal or a plan into a task.
- move_item: move or reorder an item within its own goal (new parent + position). Cross-goal moves and moving top-level goals are not supported.
- add_items: insert new subtasks under an existing parent. Added items are assigned draft ids on insertion — fetch the goal tree if you need to reference them.
- delete_items: remove items (with their subtrees) or whole goals by id.
- add_templates / update_templates / delete_templates: manage the user's weekly template blocks. Batch related blocks into one call (e.g. all three gym sessions). Updates are partial patches by id; null clears color or locationId.
- add_time_windows / update_time_windows / delete_time_windows: manage category time windows by id. Batch related windows into one call (e.g. all five weekday windows).
- update_categories: toggle a category's windows flag (useTimeWindows) or strict flag (isStrict). Strict changes need an explicit user request.

Building:
- propose_goals: create new top-level goals, or restructure a goal wholesale. Complete trees ONLY for goals you create or modify — never re-emit untouched goals, and never use this for small edits (use the editing tools instead). Emit each goal's id as its FIRST field; new nodes omit id (draft ids are assigned and reported back). deletedGoalIds removes whole goals. The order of the goals array is not meaningful.

Display:
- show_goals: bring existing goals into the user's tree pane without changing them. Pass ids, or all: true.

The user's tree pane starts nearly empty: it displays only the focused goal, goals you change, and goals you show. Template changes appear on a separate Week tab that always shows the full weekly schedule; window and flag changes appear on a Windows tab grouped by category.

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
      draftNode: {
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
            items: { $ref: "#/$defs/draftNode" },
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
        items: { $ref: "#/$defs/draftNode" },
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
    'Change fields on existing items by id — title, plannerType ("task" or "goal"; convert a leaf task into an empty goal or vice versa, or turn a plan into a task), duration (minutes), deadline (ISO date or null to clear), priority, isReady, and categoryId (top-level goals only; null to clear). An item with subtasks is always a goal — that is enforced automatically, so you never set plannerType just to fix a parent. Structural changes (adding, moving, removing items) use the other tools.',
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
            plannerType: { type: "string", enum: ["task", "goal"] },
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

const addTemplatesTool: Anthropic.Tool = {
  name: "add_templates",
  description:
    "Create weekly template blocks (fixed recurring commitments like sleep, work hours, gym sessions). One entry per weekday occurrence. Ids are minted by the app and reported back. Batch related blocks into one call.",
  input_schema: {
    type: "object",
    properties: {
      templates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            startDay: {
              type: "integer",
              description: "0-6, 0 = Sunday.",
            },
            startTime: {
              type: "string",
              description: '"HH:MM", 24-hour.',
            },
            duration: {
              type: "integer",
              description:
                "Minutes. Blocks spanning midnight keep their start day.",
            },
            color: {
              type: ["string", "null"],
              description:
                "Optional 6-digit hex; reuse one color per activity.",
            },
            locationId: {
              type: ["string", "null"],
              description: "One of the user's location ids, or null for Anywhere.",
            },
          },
          required: ["title", "startDay", "startTime", "duration"],
        },
      },
    },
    required: ["templates"],
  } as Anthropic.Tool["input_schema"],
};

const updateTemplatesTool: Anthropic.Tool = {
  name: "update_templates",
  description:
    "Change fields on existing weekly templates by id — title, startDay (0-6, 0 = Sunday), startTime (HH:MM), duration (minutes), color (null clears), locationId (null = Anywhere). Partial patches; omit fields you are not changing.",
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
            startDay: { type: "integer" },
            startTime: { type: "string" },
            duration: { type: "integer" },
            color: { type: ["string", "null"] },
            locationId: { type: ["string", "null"] },
          },
          required: ["id"],
        },
      },
    },
    required: ["updates"],
  } as Anthropic.Tool["input_schema"],
};

const deleteTemplatesTool: Anthropic.Tool = {
  name: "delete_templates",
  description: "Delete weekly template blocks by id.",
  input_schema: {
    type: "object",
    properties: {
      templateIds: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["templateIds"],
  } as Anthropic.Tool["input_schema"],
};

const addTimeWindowsTool: Anthropic.Tool = {
  name: "add_time_windows",
  description:
    "Create category time windows (the weekly hours a category's items may schedule in). One entry per day occurrence, within-day only (startTime < endTime; two windows to span midnight). Ids are minted by the app and reported back. Adding to a category with windows off enables the flag automatically.",
  input_schema: {
    type: "object",
    properties: {
      windows: {
        type: "array",
        items: {
          type: "object",
          properties: {
            categoryId: { type: "string" },
            day: {
              type: "integer",
              description: "0-6, 0 = Sunday.",
            },
            startTime: {
              type: "string",
              description: '"HH:MM", 24-hour.',
            },
            endTime: {
              type: "string",
              description:
                '"HH:MM", 24-hour, after startTime; "23:59" for end of day.',
            },
          },
          required: ["categoryId", "day", "startTime", "endTime"],
        },
      },
    },
    required: ["windows"],
  } as Anthropic.Tool["input_schema"],
};

const updateTimeWindowsTool: Anthropic.Tool = {
  name: "update_time_windows",
  description:
    "Change existing category time windows by id — day (0-6, 0 = Sunday), startTime/endTime (HH:MM, within-day), or categoryId to move a window to another category. Partial patches; omit fields you are not changing.",
  input_schema: {
    type: "object",
    properties: {
      updates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            categoryId: { type: "string" },
            day: { type: "integer" },
            startTime: { type: "string" },
            endTime: { type: "string" },
          },
          required: ["id"],
        },
      },
    },
    required: ["updates"],
  } as Anthropic.Tool["input_schema"],
};

const deleteTimeWindowsTool: Anthropic.Tool = {
  name: "delete_time_windows",
  description: "Delete category time windows by id.",
  input_schema: {
    type: "object",
    properties: {
      windowIds: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["windowIds"],
  } as Anthropic.Tool["input_schema"],
};

const updateCategoriesTool: Anthropic.Tool = {
  name: "update_categories",
  description:
    "Toggle category scheduling flags by category id: useTimeWindows (whether the category's windows constrain scheduling) and isStrict (whether its windows are reserved exclusively for its own items). Only change isStrict when the user explicitly asks. Category names, colors, and hierarchy are not editable here.",
  input_schema: {
    type: "object",
    properties: {
      updates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            useTimeWindows: { type: "boolean" },
            isStrict: { type: "boolean" },
          },
          required: ["id"],
        },
      },
    },
    required: ["updates"],
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
  // pure draftForestOps functions), so later reads within the same request
  // see earlier edits. The client mirrors each edit through forest events.
  let workingForest: DraftForest = parsed.currentForest;
  const getGoal = (id: string): DraftNode | undefined =>
    workingForest.goals.find((g) => g.id === id);

  // Same pattern for templates — a flat list, so no index/fetch dance: the
  // full list rides in the prompt and ops emit the whole next array.
  let workingTemplates: DraftTemplate[] = parsed.currentTemplates;

  // And for category windows + flags: flattened from the request categories,
  // ops emit the whole next state.
  let workingWindows: DraftWindowsState = {
    windows: parsed.categories.flatMap((c) =>
      c.timeSlots.map(
        (w): DraftTimeWindow => ({
          id: w.id,
          categoryId: c.id,
          day: w.day,
          startTime: w.startTime,
          endTime: w.endTime,
        }),
      ),
    ),
    settings: parsed.categories.map((c) => ({
      id: c.id,
      useTimeWindows: c.useTimeWindows,
      isStrict: c.isStrict,
    })),
  };

  const existingGoalIds = new Set(
    parsed.currentForest.goals.map((g) => g.id).filter((id) => id.length > 0),
  );
  const validCategoryIds = new Set(parsed.categories.map((c) => c.id));
  const validLocationIds = new Set(parsed.locations.map((l) => l.id));
  const categoryNameById = new Map(parsed.categories.map((c) => [c.id, c.name]));

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
        const trees: DraftNode[] = [];
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
        result: DraftOpsResult,
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

      // Overlapping windows are accepted by the ops (a batch may be fixed by
      // a later call) but flagged straight back to the model, which the
      // prompt instructs to resolve before ending its turn. Only pairs
      // involving windows this op touched are reported, so pre-existing
      // overlaps in the user's data don't nag on every op.
      const MAX_REPORTED_OVERLAPS = 5;
      const describeWindow = (w: DraftTimeWindow): string =>
        `"${categoryNameById.get(w.categoryId) ?? w.categoryId}" ${
          DAY_NAMES[w.day]
        } ${w.startTime}-${w.endTime} (${w.id})`;
      const buildOverlapNote = (
        state: DraftWindowsState,
        touchedIds: ReadonlySet<string>,
      ): string => {
        const overlaps = findWindowOverlaps(state.windows, touchedIds);
        if (overlaps.length === 0) return "";
        const listed = overlaps
          .slice(0, MAX_REPORTED_OVERLAPS)
          .map(({ a, b }) => `${describeWindow(a)} overlaps ${describeWindow(b)}`)
          .join("; ");
        const more =
          overlaps.length > MAX_REPORTED_OVERLAPS
            ? ` (+${overlaps.length - MAX_REPORTED_OVERLAPS} more)`
            : "";
        return ` OVERLAP WARNING: ${listed}${more}. Category windows must never overlap — adjust or delete the conflicting windows now.`;
      };

      // Windows sibling of applyTemplateOpResult — same full-state contract.
      const applyWindowOpResult = (
        result: DraftWindowOpsResult,
        appliedVerb: string,
      ): string => {
        workingWindows = result.state;
        if (result.changed) {
          send("windows", {
            windows: workingWindows.windows,
            settings: workingWindows.settings,
          });
        }
        const parts: string[] = [];
        if (result.changed) {
          parts.push(
            `${appliedVerb} — the user sees it as a pending change on the Windows tab.`,
          );
        }
        if (result.autoEnabledCategoryIds.length > 0) {
          parts.push(
            `Auto-enabled windows for: ${result.autoEnabledCategoryIds
              .map((id) => categoryNameById.get(id) ?? id)
              .join(", ")} — tell the user.`,
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

      // Template sibling of applyOpResult. The event carries the full
      // authoritative array — small list, last write wins, no client folding.
      const applyTemplateOpResult = (
        result: DraftTemplateOpsResult,
        appliedVerb: string,
      ): string => {
        workingTemplates = result.templates;
        if (result.changed) {
          send("templates", { templates: workingTemplates });
        }
        const parts: string[] = [];
        if (result.changed) {
          parts.push(
            `${appliedVerb} — the user sees it as a pending change on the Week tab.`,
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
                addTemplatesTool,
                updateTemplatesTool,
                deleteTemplatesTool,
                addTimeWindowsTool,
                updateTimeWindowsTool,
                deleteTimeWindowsTool,
                updateCategoriesTool,
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
                    hits: searchDraftItems(
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
                  ).slice(0, MAX_OP_ITEMS) as DraftItemUpdate[];
                  send("status", { tool: tu.name, count: updates.length });
                  content = applyOpResult(
                    updateDraftItems(workingForest, updates, validCategoryIds),
                    `Updated ${updates.length} item(s)`,
                  );
                  break;
                }
                case "move_item": {
                  send("status", { tool: tu.name, count: 1 });
                  content = applyOpResult(
                    moveDraftItem(workingForest, {
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
                    addDraftItems(workingForest, {
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
                    deleteDraftItems(workingForest, itemIds),
                    `Deleted ${itemIds.length} item(s)`,
                  );
                  break;
                }
                case "add_templates": {
                  const items = (
                    Array.isArray(input?.templates) ? input.templates : []
                  ).slice(0, MAX_OP_ITEMS);
                  send("status", { tool: tu.name, count: items.length });
                  const before = new Set(workingTemplates.map((t) => t.id));
                  const result = addDraftTemplates(
                    workingTemplates,
                    items,
                    validLocationIds,
                  );
                  const minted = result.templates.filter(
                    (t) => !before.has(t.id),
                  );
                  const mintedNote =
                    minted.length > 0
                      ? ` Assigned ids: ${minted
                          .map((t) => `"${t.title}" = ${t.id}`)
                          .join(", ")}.`
                      : "";
                  content =
                    applyTemplateOpResult(
                      result,
                      `Added ${minted.length} template(s)`,
                    ) + mintedNote;
                  break;
                }
                case "update_templates": {
                  const updates = (
                    Array.isArray(input?.updates) ? input.updates : []
                  ).slice(0, MAX_OP_ITEMS) as DraftTemplateUpdate[];
                  send("status", { tool: tu.name, count: updates.length });
                  content = applyTemplateOpResult(
                    updateDraftTemplates(
                      workingTemplates,
                      updates,
                      validLocationIds,
                    ),
                    `Updated ${updates.length} template(s)`,
                  );
                  break;
                }
                case "delete_templates": {
                  const templateIds = parseStringArray(
                    input?.templateIds,
                  ).slice(0, MAX_OP_ITEMS);
                  send("status", { tool: tu.name, count: templateIds.length });
                  content = applyTemplateOpResult(
                    deleteDraftTemplates(workingTemplates, templateIds),
                    `Deleted ${templateIds.length} template(s)`,
                  );
                  break;
                }
                case "add_time_windows": {
                  const items = (
                    Array.isArray(input?.windows) ? input.windows : []
                  ).slice(0, MAX_OP_ITEMS);
                  send("status", { tool: tu.name, count: items.length });
                  const before = new Set(
                    workingWindows.windows.map((w) => w.id),
                  );
                  const result = addDraftTimeWindows(
                    workingWindows,
                    items,
                    validCategoryIds,
                  );
                  const minted = result.state.windows.filter(
                    (w) => !before.has(w.id),
                  );
                  const mintedNote =
                    minted.length > 0
                      ? ` Assigned ids: ${minted
                          .map(
                            (w) =>
                              `"${
                                categoryNameById.get(w.categoryId) ??
                                w.categoryId
                              } ${DAY_NAMES[w.day]}" = ${w.id}`,
                          )
                          .join(", ")}.`
                      : "";
                  content =
                    applyWindowOpResult(
                      result,
                      `Added ${minted.length} window(s)`,
                    ) +
                    mintedNote +
                    buildOverlapNote(
                      result.state,
                      new Set(minted.map((w) => w.id)),
                    );
                  break;
                }
                case "update_time_windows": {
                  const updates = (
                    Array.isArray(input?.updates) ? input.updates : []
                  ).slice(0, MAX_OP_ITEMS) as DraftTimeWindowUpdate[];
                  send("status", { tool: tu.name, count: updates.length });
                  const result = updateDraftTimeWindows(
                    workingWindows,
                    updates,
                    validCategoryIds,
                  );
                  content =
                    applyWindowOpResult(
                      result,
                      `Updated ${updates.length} window(s)`,
                    ) +
                    buildOverlapNote(
                      result.state,
                      new Set(
                        updates
                          .map((u) => u.id)
                          .filter((id): id is string => typeof id === "string"),
                      ),
                    );
                  break;
                }
                case "delete_time_windows": {
                  const windowIds = parseStringArray(input?.windowIds).slice(
                    0,
                    MAX_OP_ITEMS,
                  );
                  send("status", { tool: tu.name, count: windowIds.length });
                  content = applyWindowOpResult(
                    deleteDraftTimeWindows(workingWindows, windowIds),
                    `Deleted ${windowIds.length} window(s)`,
                  );
                  break;
                }
                case "update_categories": {
                  const updates = (
                    Array.isArray(input?.updates) ? input.updates : []
                  ).slice(0, MAX_OP_ITEMS) as DraftCategorySettingsUpdate[];
                  send("status", { tool: tu.name, count: updates.length });
                  content = applyWindowOpResult(
                    updateDraftCategorySettings(
                      workingWindows,
                      updates,
                      validCategoryIds,
                    ),
                    `Updated ${updates.length} categor${
                      updates.length === 1 ? "y" : "ies"
                    }`,
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
                  const normalized = normalizeDraftForest({
                    goals: filtered.goals,
                    deletedGoalIds: filtered.deletedGoalIds,
                  });
                  let assignedNote = "";
                  if (normalized) {
                    const { goals: stampedGoals, newRoots } = assignDraftIds(
                      normalized.goals,
                    );
                    workingForest = mergeDraftForest(workingForest, {
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
                      // Lets the client tell finalized proposals from
                      // truncated partials when a stream is aborted.
                      complete: true,
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
