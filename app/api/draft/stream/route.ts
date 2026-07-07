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
  isValidCategoryColor,
  type DraftWindowsState,
  type DraftTimeWindow,
} from "@/components/draft/AIDraftModal/draftWindows";
import {
  addDraftCategories,
  addDraftTimeWindows,
  deleteDraftCategories,
  deleteDraftTimeWindows,
  updateDraftCategories,
  updateDraftTimeWindows,
  type DraftCategoryUpdate,
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
  color: string | null;
  parentId: string | null;
  locationId: string | null;
  isStrict: boolean;
  useTimeWindows: boolean;
  confineToOwnWindows: boolean;
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
    const {
      id,
      name,
      color,
      parentId,
      locationId,
      isStrict,
      useTimeWindows,
      confineToOwnWindows,
      timeSlots,
    } = entry as Record<string, unknown>;
    if (typeof id !== "string" || id.length === 0) {
      return "category ids must be non-empty strings";
    }
    if (typeof name !== "string" || name.length > MAX_CATEGORY_NAME_CHARS) {
      return "category names must be short strings";
    }
    if (color !== undefined && color !== null && !isValidCategoryColor(color)) {
      return "category colors must be 6-digit hex strings";
    }
    if (
      parentId !== undefined &&
      parentId !== null &&
      (typeof parentId !== "string" || parentId.length === 0)
    ) {
      return "category parentIds must be non-empty strings or null";
    }
    if (
      locationId !== undefined &&
      locationId !== null &&
      (typeof locationId !== "string" || locationId.length === 0)
    ) {
      return "category locationIds must be non-empty strings or null";
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
      color: typeof color === "string" ? color : null,
      parentId: typeof parentId === "string" ? parentId : null,
      locationId: typeof locationId === "string" ? locationId : null,
      isStrict: isStrict === true,
      useTimeWindows: useTimeWindows === true,
      confineToOwnWindows: confineToOwnWindows === true,
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

// Nested list: top-level categories are the user's roles, children indented
// beneath their parent so the model can reason about the hierarchy it is
// allowed to edit.
function buildCategoryList(
  categories: DraftCategory[],
  locations: DraftLocationRef[],
): string {
  if (categories.length === 0) return "(the user has no categories yet)";
  const locationNameById = new Map(locations.map((l) => [l.id, l.name]));
  const ids = new Set(categories.map((c) => c.id));
  const byParent = new Map<string | null, DraftCategory[]>();
  for (const c of categories) {
    const key = c.parentId !== null && ids.has(c.parentId) ? c.parentId : null;
    const list = byParent.get(key);
    if (list) list.push(c);
    else byParent.set(key, [c]);
  }
  const lines: string[] = [];
  const emit = (category: DraftCategory, depth: number) => {
    const indent = "  ".repeat(depth);
    const parts = [`${category.id}: ${category.name}`];
    if (category.color) parts.push(category.color);
    if (category.locationId) {
      parts.push(
        `@ ${locationNameById.get(category.locationId) ?? category.locationId}`,
      );
    }
    parts.push(`windows: ${category.useTimeWindows ? "on" : "off"}`);
    parts.push(`strict: ${category.isStrict ? "yes" : "no"}`);
    if (category.confineToOwnWindows) parts.push("own-windows-only");
    lines.push(`${indent}- ${parts.join(" | ")}`);
    for (const w of category.timeSlots) {
      lines.push(
        `${indent}  - window ${w.id} | ${DAY_NAMES[w.day]} ${w.startTime}-${w.endTime}`,
      );
    }
    for (const child of byParent.get(category.id) ?? []) {
      emit(child, depth + 1);
    }
  };
  for (const root of byParent.get(null) ?? []) emit(root, 0);
  return lines.join("\n");
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
  const categoryList = buildCategoryList(categories, locations);

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
The user just finished first-run setup and this is their first contact with the assistant. They may have written down a few raw thoughts in a brain-dump step — those arrive in the GOAL INDEX as untyped top-level tasks with placeholder durations and no deadlines. Nothing has been sorted: the triage is YOUR job, done by interviewing. Turn what's there into a plan that can actually be scheduled.

Work through the items warmly, one or two questions at a time — never a form or a wall of questions. For each thought, figure out what it really is and shape it:
- A single actionable stays a TASK: give it a realistic duration and, if it's time-sensitive, a deadline (update_items).
- Something bigger becomes a GOAL: break it into subtasks (add_items or propose_goals) and set a deadline where one exists. Once it has both, mark it ready to schedule by default (via update_items) so the user doesn't have to — no need to ask permission for the obvious case. If it's still missing subtasks or a deadline, leave it unready and say, in plain words, what it needs first.
- A fixed-time commitment ("dentist Tuesday 3pm", "football on Thursdays") cannot be pinned to a start time from here (there is no start-time field in your tools). If it recurs weekly, offer to add a weekly template. If it's a one-off, keep it a task with the right deadline and tell the user they can pin the exact time on the item's page later.
- Assign each item to one of the user's roles (their top-level categories — categoryId on the top-level row) where it fits. If something fits none of their roles, offer to create a fitting role (add_categories) rather than forcing it somewhere wrong — but ask before adding to the roles they picked minutes ago.

Don't end the session leaving items short of what they need to schedule — a task with no real duration, a goal with no subtasks, a goal left unready that has everything it needs. If little or nothing was dumped, interview the user about the current season of their life and draft 2-4 goals across their roles. Only propose category time windows if a natural rhythm surfaces (a fixed study block, gym mornings). Keep every message short and encouraging; nothing is committed until they press Save, so invite them to react and adjust.
`
      : "";

  return `You are a planning assistant for Circadium, a personal scheduling app.

The user's planning library is a forest of top-level goals (and loose tasks), each with a tree of subtasks. You help them restructure existing goals, create new goals with fully worked-out contents, and remove goals. You also manage their weekly template blocks — the fixed recurring commitments (sleep, work hours, standing sessions) the scheduler plans around — their categories themselves (the roles and groupings items are filed under: create, rename, recolor, reorganize, relocate, delete), and their category time windows, the weekly hours a category's items are allowed to schedule in.

STYLE
The chat renders markdown — bold, lists, and inline code are fine; avoid headings and tables in casual replies. Keep responses short and conversational; the tree pane shows the details, so don't enumerate what the user can already see there.
Speak in plain, everyday language — never the app's internal field names. The user has no idea what "isReady", "categoryId", "plannerType", "duration", "parentId", or a node id mean, and hearing them is confusing. Never say things like "isReady is false" or "I set categoryId". Say "this goal isn't ready to schedule yet", "I filed it under Work", "I set it to 30 minutes", "I made it a task". Talk about goals, tasks, deadlines, roles, and being ready to schedule — not database fields or ids.

Today's date is ${today}. Ground all deadlines relative to it.

GOAL INDEX (id | type | title | category | deadline | size)
${buildGoalIndex(currentForest, categories)}

This index is a summary. Use search_items to find specific items (including subtasks) by name, and get_goal_trees to read a goal's complete tree.

USER CATEGORIES (nesting = hierarchy; each line: id: name | color | @location | flags; "window" lines are that category's time windows)
${categoryList}

USER LOCATIONS (id: name) — read-only; you cannot create locations, only reference these ids
${locationList}

Categories organize the library: top-level categories are the user's ROLES (the hats they wear in life — the user-facing word is "role"); sub-categories group work within a role. Category rules:
- add_categories creates categories: parentId null makes a new role, a parent id nests beneath it. Ids are minted by the app and reported back. Give a new role a hex color from the palette below; sub-categories may inherit (null).
- update_categories edits name, color, parentId (reorganize; null promotes to a role), locationId (where this work usually happens — items inherit it), and the scheduling flags. Moving a category under itself or a descendant is rejected.
- delete_categories removes a category AND its whole subtree and their windows. Items filed under them are NOT deleted — they just become uncategorized. Only delete when the user explicitly asks, and confirm first if anything is filed under it.
- The scheduling flags: useTimeWindows (whether its windows constrain scheduling), isStrict (its windows are reserved exclusively for its own items), confineToOwnWindows (its items schedule ONLY in its own windows instead of also using ancestors'). isStrict and confineToOwnWindows reshape the whole schedule — only change them when the user explicitly asks.
- Do not rename or recolor categories the user didn't ask you to touch, and never invent a taxonomy wholesale without being asked — the hierarchy is the user's own mental model.

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
- isReady: top-level goals only — true marks the goal ready for scheduling, and requires at least one subtask AND a deadline (the app blocks it otherwise). Default a goal you create to ready (isReady true) whenever it has subtasks and a deadline, so it starts scheduling immediately and the user doesn't have to turn it on by hand. If it has no deadline or no subtasks, leave it unready and, in plain words, tell the user what it still needs before it can be scheduled. OMIT this field (or use null) on all child nodes; readiness cascades from the root (every row in a subtree carries the root's value, stamped on save).
- categoryId: top-level goals only — one of the user's category ids, or null. Echo it verbatim for retained goals (null on a retained goal means "leave as is"); pick a fitting category for new goals, or null if none fits. Never set it on child nodes; they inherit.
- color: top-level goals only — a 6-digit hex color for the whole goal (its subtasks inherit it on the calendar). Give every NEW goal a fitting color and vary colors across goals so the calendar doesn't come out all one shade. Good palette: #1976D2 blue, #2E7D32 green, #F77F00 orange, #6C5CE7 violet, #16A085 teal, #E63946 red, #FFB703 amber, #1D3557 navy, #8E44AD purple, #D81B60 pink. Echo the existing color verbatim for retained goals (null means "leave as is"). Never set it on child nodes; they inherit.
- splitting: schedulable leaves only (never plans, never nodes with subtasks) — {minMinutes, maxMinutes, maxMinutesPerDay} or null. Non-null makes the scheduler place the item as flexibly sized chunks (each between min and max, at most maxMinutesPerDay per day when set; maxMinutesPerDay null = no daily limit) instead of one continuous block — right for long, interruptible work like "read the textbook, 12h". minMinutes >= 5 and maxMinutes >= minMinutes. Echo it verbatim for retained nodes in propose_goals — a re-emitted tree that drops it turns chunking off. When the user speaks of it, call it splitting into chunks — never say "splitting field".
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
- update_items: change fields (title, plannerType task/goal, duration, deadline, priority, isReady; categoryId on top-level goals only; splitting on schedulable leaves — an object turns chunked scheduling on or adjusts it, null turns it off) on items by id. No fetch needed. Use this to convert an item's type — you no longer need propose_goals just to change a task into a goal or a plan into a task.
- move_item: move or reorder an item within its own goal (new parent + position). Cross-goal moves and moving top-level goals are not supported.
- add_items: insert new subtasks under an existing parent. Added items are assigned draft ids on insertion — fetch the goal tree if you need to reference them.
- delete_items: remove items (with their subtrees) or whole goals by id.
- add_templates / update_templates / delete_templates: manage the user's weekly template blocks. Batch related blocks into one call (e.g. all three gym sessions). Updates are partial patches by id; null clears color or locationId.
- add_time_windows / update_time_windows / delete_time_windows: manage category time windows by id. Batch related windows into one call (e.g. all five weekday windows).
- add_categories / update_categories / delete_categories: manage the categories themselves — create roles and sub-categories, rename, recolor, reorganize (parentId), set a location, toggle scheduling flags, delete (subtree + windows; only on explicit request). To create a parent and its children, create the parent first and use its reported id in the next call.

Building:
- propose_goals: create new top-level goals, or restructure a goal wholesale. Complete trees ONLY for goals you create or modify — never re-emit untouched goals, and never use this for small edits (use the editing tools instead). Emit each goal's id as its FIRST field; new nodes omit id (draft ids are assigned and reported back). deletedGoalIds removes whole goals. The order of the goals array is not meaningful.

Display:
- show_goals: bring existing goals into the user's tree pane without changing them. Pass ids, or all: true.

The user's tree pane starts nearly empty: it displays only the focused goal, goals you change, and goals you show. Template changes appear on a separate Week tab that always shows the full weekly schedule; category and window changes appear on a Categories tab grouped by category.

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
          color: {
            type: ["string", "null"],
            description:
              'Top-level goals only: a 6-digit hex color (e.g. "#1976D2") for the whole goal; its subtasks inherit it. Never set on child nodes.',
          },
          splitting: {
            type: ["object", "null"],
            description:
              "Schedulable leaves only: chunked-scheduling settings. Echo verbatim for retained nodes — dropping it turns chunking off.",
            properties: {
              minMinutes: { type: "integer" },
              maxMinutes: { type: "integer" },
              maxMinutesPerDay: { type: ["integer", "null"] },
            },
            required: ["minMinutes", "maxMinutes"],
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
    'Change fields on existing items by id — title, plannerType ("task" or "goal"; convert a leaf task into an empty goal or vice versa, or turn a plan into a task), duration (minutes), deadline (ISO date or null to clear), priority, isReady, categoryId (top-level goals only; null to clear), and splitting (schedulable leaves only — an object enables/adjusts chunked scheduling, null turns it off). An item with subtasks is always a goal — that is enforced automatically, so you never set plannerType just to fix a parent. Structural changes (adding, moving, removing items) use the other tools.',
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
            splitting: {
              type: ["object", "null"],
              properties: {
                minMinutes: { type: "integer" },
                maxMinutes: { type: "integer" },
                maxMinutesPerDay: { type: ["integer", "null"] },
              },
              required: ["minMinutes", "maxMinutes"],
            },
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
          splitting: {
            type: ["object", "null"],
            properties: {
              minMinutes: { type: "integer" },
              maxMinutes: { type: "integer" },
              maxMinutesPerDay: { type: ["integer", "null"] },
            },
            required: ["minMinutes", "maxMinutes"],
          },
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

const addCategoriesTool: Anthropic.Tool = {
  name: "add_categories",
  description:
    "Create categories. parentId null (or omitted) creates a top-level category — a ROLE in the user's vocabulary; a parent id nests a sub-category beneath it and must be an id you already have. Ids are minted by the app and reported back, so to create a parent and its children, create the parent first and use its reported id in a follow-up call. New categories start with windows off and strict off.",
  input_schema: {
    type: "object",
    properties: {
      categories: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            color: {
              type: ["string", "null"],
              description:
                '6-digit hex like "#1976D2"; null inherits/derives at render.',
            },
            parentId: {
              type: ["string", "null"],
              description:
                "Existing category id to nest under; null for a top-level role.",
            },
            locationId: {
              type: ["string", "null"],
              description:
                "One of the user's location ids — where this category's work usually happens (items inherit it).",
            },
          },
          required: ["name"],
        },
      },
    },
    required: ["categories"],
  } as Anthropic.Tool["input_schema"],
};

const updateCategoriesTool: Anthropic.Tool = {
  name: "update_categories",
  description:
    "Edit categories by id: name, color (6-digit hex or null), parentId (reorganize the hierarchy; null promotes to a top-level role; moving under itself or a descendant is rejected), locationId (or null), and the scheduling flags useTimeWindows, isStrict, and confineToOwnWindows. Partial patches — omit fields you are not changing. Only change isStrict or confineToOwnWindows when the user explicitly asks.",
  input_schema: {
    type: "object",
    properties: {
      updates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            color: { type: ["string", "null"] },
            parentId: { type: ["string", "null"] },
            locationId: { type: ["string", "null"] },
            useTimeWindows: { type: "boolean" },
            isStrict: { type: "boolean" },
            confineToOwnWindows: { type: "boolean" },
          },
          required: ["id"],
        },
      },
    },
    required: ["updates"],
  } as Anthropic.Tool["input_schema"],
};

const deleteCategoriesTool: Anthropic.Tool = {
  name: "delete_categories",
  description:
    "Delete categories by id, together with their whole subtree of sub-categories and all their time windows. Items filed under them are NOT deleted — they become uncategorized. Only use on an explicit user request, and confirm first when anything is filed under the category.",
  input_schema: {
    type: "object",
    properties: {
      categoryIds: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["categoryIds"],
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

  // And for the categories domain (records + their windows): built from the
  // request categories, ops emit the whole next state.
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
    categories: parsed.categories.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      parentId: c.parentId,
      locationId: c.locationId,
      useTimeWindows: c.useTimeWindows,
      isStrict: c.isStrict,
      confineToOwnWindows: c.confineToOwnWindows,
    })),
  };

  const existingGoalIds = new Set(
    parsed.currentForest.goals.map((g) => g.id).filter((id) => id.length > 0),
  );
  const validLocationIds = new Set(parsed.locations.map((l) => l.id));
  // Category ids and names must be read from the working state, not the
  // request snapshot — categories created or renamed by earlier tool calls in
  // this same request are immediately referenceable.
  const currentCategoryIds = () =>
    new Set(workingWindows.categories.map((c) => c.id));
  const categoryName = (id: string): string =>
    workingWindows.categories.find((c) => c.id === id)?.name ?? id;

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
        `"${categoryName(w.categoryId)}" ${
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

      // Categories sibling of applyTemplateOpResult — same full-state contract.
      const applyWindowOpResult = (
        result: DraftWindowOpsResult,
        appliedVerb: string,
      ): string => {
        workingWindows = result.state;
        if (result.changed) {
          send("windows", {
            windows: workingWindows.windows,
            categories: workingWindows.categories,
          });
        }
        const parts: string[] = [];
        if (result.changed) {
          parts.push(
            `${appliedVerb} — the user sees it as a pending change on the Categories tab.`,
          );
        }
        if (result.autoEnabledCategoryIds.length > 0) {
          parts.push(
            `Auto-enabled windows for: ${result.autoEnabledCategoryIds
              .map((id) => categoryName(id))
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
                addCategoriesTool,
                updateCategoriesTool,
                deleteCategoriesTool,
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
                    updateDraftItems(workingForest, updates, currentCategoryIds()),
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
                  const result = addDraftTimeWindows(workingWindows, items);
                  const minted = result.state.windows.filter(
                    (w) => !before.has(w.id),
                  );
                  const mintedNote =
                    minted.length > 0
                      ? ` Assigned ids: ${minted
                          .map(
                            (w) =>
                              `"${categoryName(w.categoryId)} ${
                                DAY_NAMES[w.day]
                              }" = ${w.id}`,
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
                case "add_categories": {
                  const items = (
                    Array.isArray(input?.categories) ? input.categories : []
                  ).slice(0, MAX_OP_ITEMS);
                  send("status", { tool: tu.name, count: items.length });
                  const before = currentCategoryIds();
                  const result = addDraftCategories(
                    workingWindows,
                    items,
                    validLocationIds,
                  );
                  const minted = result.state.categories.filter(
                    (c) => !before.has(c.id),
                  );
                  const mintedNote =
                    minted.length > 0
                      ? ` Assigned ids: ${minted
                          .map((c) => `"${c.name}" = ${c.id}`)
                          .join(
                            ", ",
                          )}. Use these ids for windows, sub-categories, and filing items.`
                      : "";
                  content =
                    applyWindowOpResult(
                      result,
                      `Created ${minted.length} categor${
                        minted.length === 1 ? "y" : "ies"
                      }`,
                    ) + mintedNote;
                  break;
                }
                case "update_categories": {
                  const updates = (
                    Array.isArray(input?.updates) ? input.updates : []
                  ).slice(0, MAX_OP_ITEMS) as DraftCategoryUpdate[];
                  send("status", { tool: tu.name, count: updates.length });
                  content = applyWindowOpResult(
                    updateDraftCategories(
                      workingWindows,
                      updates,
                      validLocationIds,
                    ),
                    `Updated ${updates.length} categor${
                      updates.length === 1 ? "y" : "ies"
                    }`,
                  );
                  break;
                }
                case "delete_categories": {
                  const categoryIds = parseStringArray(
                    input?.categoryIds,
                  ).slice(0, MAX_OP_ITEMS);
                  send("status", { tool: tu.name, count: categoryIds.length });
                  const before = workingWindows.categories;
                  const result = deleteDraftCategories(
                    workingWindows,
                    categoryIds,
                  );
                  const afterIds = new Set(
                    result.state.categories.map((c) => c.id),
                  );
                  const removed = before.filter((c) => !afterIds.has(c.id));
                  const removedNote =
                    removed.length > 0
                      ? ` Removed (with sub-categories and windows): ${removed
                          .map((c) => `"${c.name}"`)
                          .join(
                            ", ",
                          )}. Items filed under them are kept and become uncategorized.`
                      : "";
                  content =
                    applyWindowOpResult(
                      result,
                      `Deleted ${removed.length} categor${
                        removed.length === 1 ? "y" : "ies"
                      }`,
                    ) + removedNote;
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
